import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';

interface FlowState {
  state: 'idle' | 'focus' | 'break' | 'micro' | 'micro_start';
  start_epoch: number;
  break_duration_sec: number;
  elapsed_focus_sec: number;
  remaining_break_sec: number;
  banked_break_sec?: number;
  focus_at_last_break?: number;
  focus_ratio: number;
  break_ratio: number;
  writer: string;
  seq: number;
  timestamp: number;
}

interface ContextAnchor {
  file_path: string;
  relative_path: string;
  line: number;
  col: number;
  project_name: string;
  project_path: string;
  branch: string;
  timestamp: number;
  last_note: string;
  server_name: string;
}

interface RamDumpEntry {
  timestamp: string;
  now: string;
  status: string;
  next_step: string;
}

function getStateDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.LOCALAPPDATA || process.env.APPDATA || os.homedir();
    return path.join(appData, 'tether');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'tether');
  }
  const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
  return path.join(stateHome, 'tether');
}

function getConfigDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA || process.env.LOCALAPPDATA || os.homedir();
    return path.join(appData, 'tether');
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'tether');
  }
  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  return path.join(configHome, 'tether');
}

function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch {
      // ignore
    }
  }
}

function readJsonSafe<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function writeJsonSafe(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

function getFlowStatePath(): string {
  return path.join(getStateDir(), 'flow_state.json');
}

function getContextAnchorPath(): string {
  return path.join(getStateDir(), 'context_anchor.json');
}

function getRamDumpsPath(): string {
  return path.join(getStateDir(), 'ramdumps.md');
}

function getImpulsesPath(): string {
  const settings = readJsonSafe<{ side_quests_file?: string }>(
    path.join(getConfigDir(), 'settings.json')
  );
  const configured = settings?.side_quests_file?.trim();
  if (configured) {
    return configured.startsWith('~/')
      ? path.join(os.homedir(), configured.slice(2))
      : configured;
  }
  return path.join(getStateDir(), 'impulses.md');
}

function getEditorFocusPath(): string {
  return path.join(getStateDir(), 'editor_focus.json');
}

function writeEditorFocus(focused: boolean): void {
  try {
    writeJsonSafe(getEditorFocusPath(), {
      editor: 'vscode',
      focused,
      pid: process.pid,
      timestamp: Math.floor(Date.now() / 1000),
      server_name: ''
    });
  } catch (err) {
    console.error('Failed to write editor focus:', err);
  }
}

function defaultFlowState(): FlowState {
  return {
    state: 'idle',
    start_epoch: 0,
    break_duration_sec: 0,
    elapsed_focus_sec: 0,
    remaining_break_sec: 0,
    banked_break_sec: 0,
    focus_ratio: 45,
    break_ratio: 15,
    writer: 'vscode',
    seq: 0,
    timestamp: Math.floor(Date.now() / 1000)
  };
}

function readFlowState(): FlowState | null {
  return readJsonSafe<FlowState>(getFlowStatePath());
}

function writeFlowState(state: FlowState): void {
  try {
    writeJsonSafe(getFlowStatePath(), state);
  } catch (err) {
    console.error('Failed to write flow state:', err);
  }
}

function formatTime(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatDateTime(date: Date, includeSeconds: boolean): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const base = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
  return includeSeconds ? `${base}:${pad(date.getSeconds())}` : base;
}

function parseRamDumps(filePath: string): RamDumpEntry[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf8');
  const blocks = content.split('--- PAUSE / SAVE-STATE').slice(1);
  const entries: RamDumpEntry[] = [];

  for (const block of blocks) {
    if (!block.trim()) continue;
    let timestamp = '';
    let now = '';
    let status = '';
    let nextStep = '';

    for (const rawLine of block.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!timestamp && line.includes('(') && line.includes(')')) {
        const start = line.indexOf('(');
        const end = line.lastIndexOf(')');
        if (end > start) {
          timestamp = line.slice(start + 1, end).trim();
        }
      } else if (line.startsWith('[NÅ]:')) {
        now = line.slice('[NÅ]:'.length).trim();
      } else if (line.startsWith('[STATUS]:')) {
        status = line.slice('[STATUS]:'.length).trim();
      } else if (line.startsWith('[NESTE STEG]:')) {
        nextStep = line.slice('[NESTE STEG]:'.length).trim();
      }
    }

    if (now || status || nextStep) {
      entries.push({
        timestamp: timestamp || formatDateTime(new Date(), true),
        now,
        status,
        next_step: nextStep
      });
    }
  }
  return entries;
}

function serializeRamDumps(entries: RamDumpEntry[]): string {
  return entries
    .map((entry) => {
      const ts = entry.timestamp.trim() || formatDateTime(new Date(), true);
      return [
        `--- PAUSE / SAVE-STATE (${ts}) ---`,
        `[NÅ]:         ${entry.now}`,
        `[STATUS]:     ${entry.status}`,
        `[NESTE STEG]: ${entry.next_step}`,
        '--------------------------------------------\n'
      ].join('\n');
    })
    .join('\n');
}

function appendRamDump(nowText: string, statusText: string, nextText: string): void {
  const filePath = getRamDumpsPath();
  ensureDir(path.dirname(filePath));
  const entries = parseRamDumps(filePath);
  entries.push({
    timestamp: formatDateTime(new Date(), true),
    now: nowText,
    status: statusText,
    next_step: nextText
  });
  fs.writeFileSync(filePath, serializeRamDumps(entries), 'utf8');
}

function appendImpulse(text: string): void {
  const trimmed = text.trim();
  if (!trimmed) return;
  const filePath = getImpulsesPath();
  ensureDir(path.dirname(filePath));
  const stamp = formatDateTime(new Date(), false);

  if (filePath.endsWith('.json')) {
    const existing = readJsonSafe<Array<Record<string, unknown>>>(filePath);
    const items = Array.isArray(existing) ? existing : [];
    items.push({
      text: trimmed,
      created_at: stamp,
      done: false,
      completed_at: null
    });
    writeJsonSafe(filePath, items);
    return;
  }

  fs.appendFileSync(filePath, `- [ ] [${stamp}] ${trimmed}\n`, 'utf8');
}

function countOpenImpulses(): number {
  const filePath = getImpulsesPath();
  if (!fs.existsSync(filePath)) return 0;
  try {
    if (filePath.endsWith('.json')) {
      const items = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return Array.isArray(items) ? items.filter((i: { done?: boolean }) => !i.done).length : 0;
    }
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    let open = 0;
    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed.startsWith('- ')) continue;
      if (trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) continue;
      open += 1;
    }
    return open;
  } catch {
    return 0;
  }
}

function detectEnclosingSymbol(doc: vscode.TextDocument, cursorLine: number): string {
  const patterns = [
    /^#{1,6}\s+(.+)$/,
    /^\s*(?:pub\s+(?:async\s+)?)?fn\s+([A-Za-z0-9_]+)/,
    /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/,
    /^\s*(?:export\s+)?(?:class|struct|enum|trait|interface)\s+([A-Za-z0-9_]+)/,
    /^\s*impl(?:<[^>]*>)?\s+([A-Za-z0-9_:]+)/,
    /^\s*(?:async\s+)?def\s+([A-Za-z0-9_]+)/
  ];

  const start = Math.min(cursorLine, doc.lineCount - 1);
  for (let i = start; i >= Math.max(0, start - 150); i--) {
    const text = doc.lineAt(i).text;
    for (const re of patterns) {
      const m = re.exec(text);
      if (m && m[0]) {
        return text.trim().slice(0, 80);
      }
    }
  }
  return '';
}

function getConfigBool(key: string, fallback: boolean): boolean {
  return vscode.workspace.getConfiguration('tether').get<boolean>(key, fallback);
}

function computeStatusDisplay(state: FlowState | null): { text: string; summary: string } {
  if (!state) {
    return { text: '$(compass) 00:00 [KLAR]', summary: 'Hvile (klar til start)' };
  }
  const nowEpoch = Math.floor(Date.now() / 1000);
  switch (state.state) {
    case 'focus': {
      const elapsed =
        state.elapsed_focus_sec + (state.start_epoch > 0 ? Math.max(0, nowEpoch - state.start_epoch) : 0);
      return {
        text: `$(watch) ${formatTime(elapsed)} [FOKUS]`,
        summary: `Fokus (${formatTime(elapsed)})`
      };
    }
    case 'break': {
      const base = Math.max(state.break_duration_sec || 0, state.remaining_break_sec || 0);
      const elapsed = state.start_epoch > 0 ? Math.max(0, nowEpoch - state.start_epoch) : 0;
      const remaining = Math.max(0, base - elapsed);
      return {
        text: `$(coffee) ${formatTime(remaining)} [PAUSE]`,
        summary: `Pause (${formatTime(remaining)} igjen)`
      };
    }
    case 'micro':
    case 'micro_start': {
      const elapsed = state.start_epoch > 0 ? Math.max(0, nowEpoch - state.start_epoch) : 0;
      const remaining = Math.max(0, 300 - elapsed);
      return {
        text: `$(zap) ${formatTime(remaining)} [5M MIKRO]`,
        summary: `5m Mikrostart (${formatTime(remaining)})`
      };
    }
    default:
      return { text: '$(compass) 00:00 [KLAR]', summary: 'Hvile (klar til start)' };
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const statusBar = vscode.window.createStatusBarItem(
    'tether.statusBar',
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.name = 'Tether Flowmodoro';
  statusBar.command = 'tether.openHub';
  statusBar.tooltip = 'Tether: Åpne kontrollmeny (Flowmodoro, RAM-dumps, Impulser)';

  const applyStatusBarVisibility = () => {
    if (getConfigBool('showStatusBar', true)) {
      statusBar.text = computeStatusDisplay(readFlowState()).text;
      statusBar.show();
    } else {
      statusBar.hide();
    }
  };
  applyStatusBarVisibility();
  context.subscriptions.push(statusBar);

  const timer = setInterval(() => {
    if (!getConfigBool('showStatusBar', true)) return;
    statusBar.text = computeStatusDisplay(readFlowState()).text;
  }, 1000);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });

  let lastAnchorAt = 0;
  const saveContextAnchor = (note?: string, force = false) => {
    if (!getConfigBool('autoAnchor', true)) return;
    const nowMs = Date.now();
    if (!force && nowMs - lastAnchorAt < 1500) return;
    lastAnchorAt = nowMs;

    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document || editor.document.isUntitled) {
      return;
    }

    const filePath = editor.document.uri.fsPath;
    const line = editor.selection.active.line + 1;
    const col = editor.selection.active.character;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    const projectPath = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(filePath);
    const projectName = workspaceFolder ? workspaceFolder.name : path.basename(projectPath);
    const relativePath = path.relative(projectPath, filePath) || path.basename(filePath);
    const enclosing = detectEnclosingSymbol(editor.document, editor.selection.active.line);
    const defaultNote = enclosing ? `${relativePath} • ${enclosing}` : 'Aktiv i VS Code';

    exec('git branch --show-current', { cwd: projectPath }, (_, stdout) => {
      const anchor: ContextAnchor = {
        file_path: filePath,
        relative_path: relativePath,
        line,
        col,
        project_name: projectName,
        project_path: projectPath,
        branch: (stdout || '').trim(),
        timestamp: Math.floor(Date.now() / 1000),
        last_note: note || defaultNote,
        server_name: 'vscode'
      };
      try {
        writeJsonSafe(getContextAnchorPath(), anchor);
      } catch (err) {
        console.error('Failed to save context anchor:', err);
      }
    });
  };

  const buildActiveCodeSuggestion = (): { now: string; status: string; next: string } => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !editor.document || editor.document.isUntitled) {
      return {
        now: 'Jobber i VS Code',
        status: 'Ingen aktiv fil valgt',
        next: 'Åpne filen du skal jobbe videre med'
      };
    }

    const filePath = editor.document.uri.fsPath;
    const line = editor.selection.active.line + 1;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    const projectPath = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(filePath);
    const projectName = workspaceFolder ? workspaceFolder.name : path.basename(projectPath);
    const rel = path.relative(projectPath, filePath) || path.basename(filePath);
    const symbol = detectEnclosingSymbol(editor.document, editor.selection.active.line);
    const lineText = editor.document.lineAt(editor.selection.active.line).text.trim().slice(0, 70);

    return {
      now: symbol
        ? `Jobber i ${rel} ved «${symbol}» (${projectName})`
        : `Jobber i ${rel} (${projectName})`,
      status: lineText ? `Linje ${line}: "${lineText}"` : `Markør på linje ${line}`,
      next: `Fortsett ved linje ${line} i ${rel}`
    };
  };

  const promptRamDumpFields = async (
    initialNow: string,
    initialStatus: string,
    initialNext: string
  ): Promise<{ now: string; status: string; next: string } | null> => {
    const nowVal = await vscode.window.showInputBox({
      title: 'Tether RAM-dump (1/3)',
      prompt: '[NÅ] Hva jobber du med akkurat nå?',
      value: initialNow,
      placeHolder: 'F.eks. Implementerer auth-middleware i api.ts'
    });
    if (nowVal === undefined) return null;

    const statusVal = await vscode.window.showInputBox({
      title: 'Tether RAM-dump (2/3)',
      prompt: '[STATUS] Hvor langt har du kommet / hva gjenstår?',
      value: initialStatus,
      placeHolder: 'F.eks. Token-sjekk ferdig, mangler error-håndtering'
    });
    if (statusVal === undefined) return null;

    const nextVal = await vscode.window.showInputBox({
      title: 'Tether RAM-dump (3/3)',
      prompt: '[NESTE STEG] Det aller minste neste grepet når du er tilbake:',
      value: initialNext,
      placeHolder: 'F.eks. Skriv test for utløpt token på linje 42'
    });
    if (nextVal === undefined) return null;

    if (!nowVal.trim() && !statusVal.trim() && !nextVal.trim()) {
      vscode.window.showWarningMessage('Fyll ut minst ett felt før du lagrer RAM-dump.');
      return null;
    }

    return {
      now: nowVal.trim(),
      status: statusVal.trim(),
      next: nextVal.trim()
    };
  };

  const toggleFlow = () => {
    let state = readFlowState();
    const nowEpoch = Math.floor(Date.now() / 1000);

    if (!state || state.state === 'idle') {
      state = {
        ...defaultFlowState(),
        state: 'focus',
        start_epoch: nowEpoch,
        seq: (state?.seq || 0) + 1,
        timestamp: nowEpoch
      };
      vscode.window.showInformationMessage('🚀 Fokus-økt startet i Tether!');
    } else if (state.state === 'focus') {
      const elapsed = state.elapsed_focus_sec + (state.start_epoch > 0 ? Math.max(0, nowEpoch - state.start_epoch) : 0);
      const newlyFocused = Math.max(0, elapsed - (state.focus_at_last_break || 0));
      const earned = Math.round((newlyFocused * state.break_ratio) / Math.max(1, state.focus_ratio));
      const totalBreak = Math.max(30, (state.banked_break_sec || 0) + earned);
      state = {
        ...state,
        state: 'break',
        start_epoch: nowEpoch,
        elapsed_focus_sec: elapsed,
        break_duration_sec: totalBreak,
        remaining_break_sec: totalBreak,
        banked_break_sec: 0,
        focus_at_last_break: elapsed,
        writer: 'vscode',
        seq: state.seq + 1,
        timestamp: nowEpoch
      };
      vscode.window.showInformationMessage(`☕ Velfortjent pause på ${formatTime(totalBreak)} startet!`);
    } else if (state.state === 'break') {
      const base = Math.max(state.break_duration_sec || 0, state.remaining_break_sec || 0);
      const elapsed = state.start_epoch > 0 ? Math.max(0, nowEpoch - state.start_epoch) : 0;
      const remaining = Math.max(0, base - elapsed);
      state = {
        ...state,
        state: 'focus',
        start_epoch: nowEpoch - state.elapsed_focus_sec,
        break_duration_sec: 0,
        remaining_break_sec: 0,
        banked_break_sec: remaining,
        focus_at_last_break: state.elapsed_focus_sec,
        writer: 'vscode',
        seq: state.seq + 1,
        timestamp: nowEpoch
      };
      vscode.window.showInformationMessage(
        `🚀 Fokus gjenopptatt fra ${formatTime(state.elapsed_focus_sec)} (${formatTime(remaining)} pause spart).`
      );
    } else {
      state = {
        ...defaultFlowState(),
        seq: state.seq + 1,
        timestamp: nowEpoch
      };
      vscode.window.showInformationMessage('⏹ Flowmodoro satt til hvile.');
    }

    writeFlowState(state);
    statusBar.text = computeStatusDisplay(state).text;
    saveContextAnchor('Endret flytstatus', true);
  };

  const startMicroStart = () => {
    const prev = readFlowState();
    const nowEpoch = Math.floor(Date.now() / 1000);
    const state: FlowState = {
      ...defaultFlowState(),
      state: 'micro_start',
      start_epoch: nowEpoch,
      remaining_break_sec: 300,
      focus_ratio: prev?.focus_ratio || 45,
      break_ratio: prev?.break_ratio || 15,
      writer: 'vscode',
      seq: (prev?.seq || 0) + 1,
      timestamp: nowEpoch
    };
    writeFlowState(state);
    statusBar.text = computeStatusDisplay(state).text;
    saveContextAnchor('Startet 5m mikro-start', true);
    vscode.window.showInformationMessage('⚡ 5m Mikrostart aktiv! Null skyldfølelse om du stopper etterpå.');
  };

  const resetFlow = () => {
    const prev = readFlowState();
    const state: FlowState = {
      ...defaultFlowState(),
      focus_ratio: prev?.focus_ratio || 45,
      break_ratio: prev?.break_ratio || 15,
      seq: (prev?.seq || 0) + 1,
      timestamp: Math.floor(Date.now() / 1000)
    };
    writeFlowState(state);
    statusBar.text = computeStatusDisplay(state).text;
  };

  const captureImpulse = async () => {
    const thought = await vscode.window.showInputBox({
      title: 'Tether — Parkér impuls / avsporing',
      prompt: 'Skriv ned tanken raskt så du kan fortsette arbeidet uten å miste fokus.',
      placeHolder: 'F.eks. Sjekke API-token, vaske klær, lese kapittel 3...'
    });

    if (thought && thought.trim().length > 0) {
      try {
        appendImpulse(thought);
        vscode.window.showInformationMessage('💡 Tanke parkert i impulses.md! Hodet er fritt igjen.');
      } catch (err) {
        vscode.window.showErrorMessage(`Kunne ikke lagre impulsen: ${String(err)}`);
      }
    }
  };

  const openRamDumpManager = async () => {
    const filePath = getRamDumpsPath();
    const entries = parseRamDumps(filePath);

    interface ManagerPickItem extends vscode.QuickPickItem {
      action: 'new_auto' | 'new_blank' | 'entry';
      entryIndex?: number;
    }

    const items: ManagerPickItem[] = [
      {
        label: '$(sparkle) Ny RAM-dump (autofyll fra aktiv fil og markør)',
        description: 'Fyller inn [NÅ], [STATUS] og [NESTE STEG] automatisk',
        action: 'new_auto'
      },
      {
        label: '$(add) Ny tom RAM-dump',
        description: 'Skriv inn alle feltene selv',
        action: 'new_blank'
      }
    ];

    for (let idx = entries.length - 1; idx >= 0; idx--) {
      const e = entries[idx];
      items.push({
        label: `$(history) ${e.now || '(uten [NÅ])'}`,
        description: e.timestamp,
        detail: `STATUS: ${e.status}  •  NESTE: ${e.next_step}`,
        action: 'entry',
        entryIndex: idx
      });
    }

    const picked = await vscode.window.showQuickPick(items, {
      title: 'Tether — Arbeidsminne / RAM-dumps',
      placeHolder: 'Opprett ny RAM-dump eller velg en eksisterende for å redigere/slette'
    });
    if (!picked) return;

    if (picked.action === 'new_auto' || picked.action === 'new_blank') {
      const sug = picked.action === 'new_auto'
        ? buildActiveCodeSuggestion()
        : { now: '', status: '', next: '' };
      const res = await promptRamDumpFields(sug.now, sug.status, sug.next);
      if (res) {
        appendRamDump(res.now, res.status, res.next);
        vscode.window.showInformationMessage('🧠 RAM-dump lagret i ramdumps.md.');
      }
      return;
    }

    const idx = picked.entryIndex;
    if (idx === undefined || !entries[idx]) return;
    const entry = entries[idx];

    const op = await vscode.window.showQuickPick(
      [
        { label: '$(edit) Rediger RAM-dump', action: 'edit' as const },
        { label: '$(trash) Slett RAM-dump', action: 'delete' as const }
      ],
      {
        title: `RAM-dump (${entry.timestamp})`,
        placeHolder: entry.now
      }
    );
    if (!op) return;

    if (op.action === 'edit') {
      const res = await promptRamDumpFields(entry.now, entry.status, entry.next_step);
      if (res) {
        const latest = parseRamDumps(filePath);
        if (latest[idx]) {
          latest[idx].now = res.now;
          latest[idx].status = res.status;
          latest[idx].next_step = res.next;
          fs.writeFileSync(filePath, serializeRamDumps(latest), 'utf8');
          vscode.window.showInformationMessage('✅ RAM-dump oppdatert.');
        }
      }
    } else {
      const latest = parseRamDumps(filePath);
      if (idx >= 0 && idx < latest.length) {
        latest.splice(idx, 1);
        fs.writeFileSync(filePath, serializeRamDumps(latest), 'utf8');
        vscode.window.showInformationMessage('🗑️ RAM-dump slettet.');
      }
    }
  };

  const runShutdownRitual = async () => {
    const sug = buildActiveCodeSuggestion();

    const summaryNow = await vscode.window.showInputBox({
      title: 'Tether Kveldsavslutning (1/2)',
      prompt: '[OPPSUMMERING] Hva jobbet du med i dag?',
      value: sug.now,
      placeHolder: 'F.eks. Fullførte RAM-dump CRUD i Tether'
    });
    if (summaryNow === undefined) return;

    const tomorrowStep = await vscode.window.showInputBox({
      title: 'Tether Kveldsavslutning (2/2)',
      prompt: '[I MORGEN] Det aller første lille steget i morgen:',
      value: sug.next,
      placeHolder: 'F.eks. Kjør testene og sjekk extension.ts linje 120'
    });
    if (tomorrowStep === undefined) return;

    resetFlow();

    if (summaryNow.trim() || tomorrowStep.trim()) {
      appendRamDump(
        summaryNow.trim(),
        'Dagsavslutning (parkert for kvelden)',
        tomorrowStep.trim()
      );
    }

    const now = new Date();
    const record = {
      timestamp: Math.floor(now.getTime() / 1000),
      date: formatDateTime(now, false).slice(0, 10),
      tomorrow_first_step: tomorrowStep.trim(),
      summary_now: summaryNow.trim(),
      remaining_impulses: countOpenImpulses()
    };
    writeJsonSafe(path.join(getStateDir(), 'last_shutdown.json'), record);
    vscode.window.showInformationMessage('🌙 Arbeidsminnet er trygt parkert. God kveld!');
  };

  const openDesktopApp = () => {
    const localBin = path.join(os.homedir(), '.local', 'bin', 'tether');
    const cmd = fs.existsSync(localBin) ? `"${localBin}"` : 'tether';
    exec(cmd, (err) => {
      if (err) {
        vscode.window.showWarningMessage('Kunne ikke starte Tether Desktop direkte.');
      }
    });
  };

  const openHub = async () => {
    const display = computeStatusDisplay(readFlowState());
    const flow = readFlowState();
    const toggleLabel = flow?.state === 'focus'
      ? '$(coffee) Ta velfortjent pause'
      : '$(flame) Start / Pause Flowmodoro';

    const picks = [
      { label: toggleLabel, description: display.summary, run: toggleFlow },
      { label: '$(zap) Start 5-minutters Mikrostart', description: 'Senk dørstokkmila', run: startMicroStart },
      { label: '$(checklist) Arbeidsminne / RAM-dumps', description: 'Opprett, autofyll, rediger eller slett', run: openRamDumpManager },
      { label: '$(lightbulb) Parkér impuls / avsporing', description: 'Lagre raskt til impulses.md', run: captureImpulse },
      { label: '$(archive) Avslutt dagen (Shutdown Ritual)', description: 'Parkér trådene og morgenens første steg', run: runShutdownRitual },
      { label: '$(debug-stop) Nullstill Flowmodoro-timer', description: 'Sett timer tilbake til hvile', run: resetFlow },
      { label: '$(window) Åpne Tether Desktop', description: 'Start eller hent frem skrivebordsappen', run: openDesktopApp }
    ];

    const selected = await vscode.window.showQuickPick(picks, {
      title: `Tether Hub — ${display.summary}`,
      placeHolder: 'Velg handling'
    });
    if (selected) {
      await selected.run();
    }
  };

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => saveContextAnchor(undefined, true)),
    vscode.window.onDidChangeTextEditorSelection(() => saveContextAnchor(undefined, false)),
    vscode.workspace.onDidSaveTextDocument(() => saveContextAnchor('Lagret fil', true)),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('tether')) {
        applyStatusBarVisibility();
      }
    }),
    vscode.commands.registerCommand('tether.openHub', openHub),
    vscode.commands.registerCommand('tether.toggleFlow', toggleFlow),
    vscode.commands.registerCommand('tether.microStart', startMicroStart),
    vscode.commands.registerCommand('tether.resetFlow', resetFlow),
    vscode.commands.registerCommand('tether.captureImpulse', captureImpulse),
    vscode.commands.registerCommand('tether.ramDump', captureImpulse),
    vscode.commands.registerCommand('tether.ramDumpManager', openRamDumpManager),
    vscode.commands.registerCommand('tether.shutdownRitual', runShutdownRitual),
    vscode.commands.registerCommand('tether.openDesktop', openDesktopApp)
  );

  writeEditorFocus(vscode.window.state.focused);
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState((windowState) => {
      writeEditorFocus(windowState.focused);
      if (!windowState.focused) {
        saveContextAnchor('Fokus byttet bort fra VS Code', true);
      }
    })
  );

  saveContextAnchor('Åpnet VS Code', true);
}

export function deactivate(): void {
  writeEditorFocus(false);
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document && !editor.document.isUntitled) {
    const filePath = editor.document.uri.fsPath;
    const line = editor.selection.active.line + 1;
    const col = editor.selection.active.character;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    const projectPath = workspaceFolder ? workspaceFolder.uri.fsPath : path.dirname(filePath);
    const projectName = workspaceFolder ? workspaceFolder.name : path.basename(projectPath);

    const anchor: ContextAnchor = {
      file_path: filePath,
      relative_path: path.relative(projectPath, filePath) || path.basename(filePath),
      line,
      col,
      project_name: projectName,
      project_path: projectPath,
      branch: '',
      timestamp: Math.floor(Date.now() / 1000),
      last_note: 'Lukket VS Code',
      server_name: 'vscode'
    };
    try {
      writeJsonSafe(getContextAnchorPath(), anchor);
    } catch {
      // ignore on exit
    }
  }
}
