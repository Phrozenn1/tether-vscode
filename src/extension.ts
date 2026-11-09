import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';

interface FlowState {
  state: 'idle' | 'focus' | 'break' | 'micro';
  start_epoch: number;
  break_duration_sec: number;
  elapsed_focus_sec: number;
  remaining_break_sec: number;
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

function getStateDir(): string {
  if (process.platform === 'win32') {
    const appData = process.env.LOCALAPPDATA || process.env.APPDATA || os.homedir();
    return path.join(appData, 'tether');
  } else if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'tether');
  } else {
    // Linux / XDG
    const stateHome = process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state');
    return path.join(stateHome, 'tether');
  }
}

function getFlowStatePath(): string {
  return path.join(getStateDir(), 'flow_state.json');
}

function getContextAnchorPath(): string {
  return path.join(getStateDir(), 'context_anchor.json');
}

function getImpulsesPath(): string {
  return path.join(getStateDir(), 'impulses.md');
}

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
    } catch {
      // ignore
    }
  }
}

function readFlowState(): FlowState | null {
  try {
    const p = getFlowStatePath();
    if (fs.existsSync(p)) {
      const data = fs.readFileSync(p, 'utf8');
      return JSON.parse(data) as FlowState;
    }
  } catch {
    // ignore
  }
  return null;
}

function writeFlowState(state: FlowState) {
  try {
    ensureDir(getStateDir());
    fs.writeFileSync(getFlowStatePath(), JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write flow state:', err);
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function activate(context: vscode.ExtensionContext) {
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = 'tether.toggleFlow';
  statusBar.tooltip = 'Tether: Flowmodoro & ADHD Save-State (Klikk for å starte/pause)';
  statusBar.text = '$(compass) Tether: Klar';
  statusBar.show();
  context.subscriptions.push(statusBar);

  // Sync Timer loop (updates status bar every second)
  const timer = setInterval(() => {
    const state = readFlowState();
    if (!state) {
      statusBar.text = '$(compass) Tether: Klar';
      return;
    }

    const nowEpoch = Math.floor(Date.now() / 1000);
    switch (state.state) {
      case 'focus': {
        const elapsed = state.elapsed_focus_sec + (state.start_epoch > 0 ? (nowEpoch - state.start_epoch) : 0);
        statusBar.text = `$(watch) ${formatTime(elapsed)} [FOKUS]`;
        statusBar.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
        break;
      }
      case 'break': {
        let remaining = state.remaining_break_sec;
        if (state.start_epoch > 0) {
          const pass = nowEpoch - state.start_epoch;
          remaining = Math.max(0, state.remaining_break_sec - pass);
        }
        statusBar.text = `$(coffee) ${formatTime(remaining)} [PAUSE]`;
        statusBar.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        break;
      }
      case 'micro': {
        statusBar.text = `$(zap) [5 MIN MIKRO]`;
        statusBar.color = new vscode.ThemeColor('statusBarItem.prominentForeground');
        break;
      }
      default:
        statusBar.text = '$(compass) Tether: Klar';
        statusBar.color = undefined;
        break;
    }
  }, 1000);

  context.subscriptions.push({
    dispose: () => clearInterval(timer)
  });

  // Automatic Context Anchor on editor change
  const saveContextAnchor = (note?: string) => {
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
    const relativePath = path.relative(projectPath, filePath);

    // Get git branch
    exec('git branch --show-current', { cwd: projectPath }, (_, stdout) => {
      const branch = (stdout || '').trim();

      const anchor: ContextAnchor = {
        file_path: filePath,
        relative_path: relativePath || path.basename(filePath),
        line,
        col,
        project_name: projectName,
        project_path: projectPath,
        branch,
        timestamp: Math.floor(Date.now() / 1000),
        last_note: note || 'Aktiv i VS Code',
        server_name: 'vscode'
      };

      try {
        ensureDir(getStateDir());
        fs.writeFileSync(getContextAnchorPath(), JSON.stringify(anchor), 'utf8');
      } catch (err) {
        console.error('Failed to save context anchor:', err);
      }
    });
  };

  // Register editor listeners for context anchor
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(() => saveContextAnchor()),
    vscode.workspace.onDidSaveTextDocument(() => saveContextAnchor('Lagret fil'))
  );

  // Command: Start / Pause Flow
  context.subscriptions.push(
    vscode.commands.registerCommand('tether.toggleFlow', () => {
      let state = readFlowState();
      const nowEpoch = Math.floor(Date.now() / 1000);

      if (!state || state.state === 'idle') {
        state = {
          state: 'focus',
          start_epoch: nowEpoch,
          break_duration_sec: 0,
          elapsed_focus_sec: 0,
          remaining_break_sec: 0,
          focus_ratio: 45,
          break_ratio: 15,
          writer: 'vscode',
          seq: (state?.seq || 0) + 1,
          timestamp: nowEpoch
        };
        vscode.window.showInformationMessage('🚀 Fokus-økt startet i Tether!');
      } else if (state.state === 'focus') {
        // Switch to break
        const elapsed = state.elapsed_focus_sec + (nowEpoch - state.start_epoch);
        const earned = Math.round((elapsed * state.break_ratio) / state.focus_ratio);
        state = {
          ...state,
          state: 'break',
          start_epoch: nowEpoch,
          elapsed_focus_sec: elapsed,
          break_duration_sec: earned,
          remaining_break_sec: earned,
          writer: 'vscode',
          seq: state.seq + 1,
          timestamp: nowEpoch
        };
        vscode.window.showInformationMessage(`☕ Velfortjent pause på ${formatTime(earned)} startet!`);
      } else {
        // Switch back to idle
        state = {
          ...state,
          state: 'idle',
          start_epoch: 0,
          elapsed_focus_sec: 0,
          remaining_break_sec: 0,
          writer: 'vscode',
          seq: state.seq + 1,
          timestamp: nowEpoch
        };
        vscode.window.showInformationMessage('⏹ Flytstopp registrert.');
      }

      writeFlowState(state);
      saveContextAnchor('Endret flytstatus');
    })
  );

  // Command: 5m Micro-start
  context.subscriptions.push(
    vscode.commands.registerCommand('tether.microStart', () => {
      const nowEpoch = Math.floor(Date.now() / 1000);
      const state: FlowState = {
        state: 'micro',
        start_epoch: nowEpoch,
        break_duration_sec: 0,
        elapsed_focus_sec: 0,
        remaining_break_sec: 300,
        focus_ratio: 45,
        break_ratio: 15,
        writer: 'vscode',
        seq: Date.now(),
        timestamp: nowEpoch
      };
      writeFlowState(state);
      saveContextAnchor('Startet 5m mikro-start');
      vscode.window.showInformationMessage('⚡ Bare 5 minutter for å bryte dørstokkmila. Null skyldfølelse!');
    })
  );

  // Command: Rapid RAM dump
  context.subscriptions.push(
    vscode.commands.registerCommand('tether.ramDump', async () => {
      const thought = await vscode.window.showInputBox({
        prompt: '🧠 Hva tenker du på? Parkér tanken her med en gang.',
        placeHolder: 'F.eks: Husk å sjekke API-token, vaske klær, ringe tannlegen...'
      });

      if (thought && thought.trim().length > 0) {
        try {
          ensureDir(getStateDir());
          const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
          const line = `- [ ] ${thought.trim()} *(parkert fra VS Code ${dateStr})*\n`;
          fs.appendFileSync(getImpulsesPath(), line, 'utf8');
          vscode.window.showInformationMessage('💡 Tanke parkert! Hodet er fritt igjen.');
        } catch (err) {
          vscode.window.showErrorMessage('Kunne ikke lagre impulsen: ' + String(err));
        }
      }
    })
  );

  // Command: Open Tether Desktop
  context.subscriptions.push(
    vscode.commands.registerCommand('tether.openDesktop', () => {
      exec('tether || /home/kim/.local/bin/tether', (err) => {
        if (err) {
          vscode.window.showWarningMessage('Kunne ikke starte Tether Desktop direkte.');
        }
      });
    })
  );

  // Initial anchor save
  saveContextAnchor('Åpnet VS Code');
}

export function deactivate() {
  // Final anchor update on exit
  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document) {
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
      ensureDir(getStateDir());
      fs.writeFileSync(getContextAnchorPath(), JSON.stringify(anchor), 'utf8');
    } catch {
      // ignore on exit
    }
  }
}
