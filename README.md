# Tether for Visual Studio Code ⚓

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/Phrozenn1.tether-vscode?style=flat-square&color=22d3ee&label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=Phrozenn1.tether-vscode)
[![License: GPL v2](https://img.shields.io/badge/License-GPL_v2-blue.svg?style=flat-square)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-Phrozenn1%2Ftether--vscode-181717?style=flat-square&logo=github)](https://github.com/Phrozenn1/tether-vscode)

> **Flowmodoro timer, automatic context save-states, and cognitive anchoring for deep work, neurodivergent minds, and focus.**  
> Seamlessly integrated with [Tether Desktop](https://github.com/Phrozenn1/tether-desktop), [tether.nvim](https://github.com/Phrozenn1/tether.nvim), and [tether-obsidian](https://github.com/Phrozenn1/tether-obsidian).

---

## 💡 Why Tether?

Traditional productivity techniques frequently fail modern knowledge workers, writers, and developers—especially neurodivergent minds (**ADHD**, **Autism/ASD**, **Dyslexia**, and **AuDHD**):
- **Rigid Pomodoros shatter deep focus & flow:** An arbitrary alarm ringing after 25 minutes interrupts peak problem-solving momentum and causes traumatic context disorientation.
- **Context-switch paralysis & visual re-orientation:** When an interruption occurs, remembering what you were doing, which file you had open, and what line you were on costs 15–20 minutes of executive energy.
- **Initiation & transition barriers:** Getting started on an overwhelming task (or breaking out of inertia) feels like hitting an impenetrable wall.

**Tether adapts to your brain instead of forcing you into neurotypical boxes:**
1. **Ride the focus wave** for as long as you have momentum.
2. **Earn guilt-free rest** directly proportional to your effort.
3. **Never lose your place** when life or notifications pull you away.

---

## ✨ Features

### ⏱ 1. Flowmodoro Timer in the Status Bar
- Tracks your deep work count-up in the status bar (`$(watch) 34:12 [FOKUS]`).
- When you pause, Tether automatically calculates your earned rest based on your focus-to-break ratio (e.g. 45 min focus = 15 min rest) and counts down (`$(coffee) 15:00 [PAUSE]`).
- Zero guilt, zero arbitrary cutoffs. Stop when you naturally lose momentum.

### ⚓ 2. Automatic Context Anchoring (Save-State)
- Every time you switch files, edit a document, or change branches, Tether silently records your **exact active file, line number, column, project name, and git branch**.
- If you step away or get distracted, your context is safely tethered. When you open **Tether Desktop**, click **"Resume in VS Code 🚀"** to instantly jump back to the exact line where you left off.

### ⚡ 3. 5-Minute Micro-Start (Break the Friction)
- Struggling with initiation inertia? Trigger `Tether: 5m Micro-Start`.
- Commit to **only 5 minutes** of work. If you still don't feel like continuing after 5 minutes, you have permission to stop guilt-free. If momentum kicks in, Tether smoothly rolls into a full focus session.

### 🧠 4. Working Memory / RAM-Dumps & Rapid Impulse Buffer
- **Full RAM-Dump CRUD Manager (`Tether: Working Memory / RAM-Dumps`)**: Create, auto-fill from your active file and enclosing symbol (`[NÅ]` / `[STATUS]` / `[NESTE STEG]`), edit, or delete structured save-states in `ramdumps.md`.
- **Rapid Impulse Capture (`Tether: Park Impulse / Side-Quest`)**: Sudden distracting ideas or errands? Offload the thought straight into your persistent `impulses.md` checklist without leaving your code.

### 🌙 5. Evening Shutdown Ritual
- Cleanly resets the active Flowmodoro timer, captures a closing summary and tomorrow's first micro-step in `ramdumps.md` + `last_shutdown.json`, and counts remaining open impulses for **"Where Was I?"** the next day.

### 🎨 6. Live Theme Adaptive
- Fully respects your active VS Code theme colors (Omarchy, Tokyo Night, Gruvbox, Catppuccin, Default Dark+/Light+) with high-contrast text readability.

### 🌐 7. Platform-Agnostic Editor Focus Sync
- Automatically syncs window focus state (`vscode.window.onDidChangeWindowState`) to `editor_focus.json`.
- Allows Tether Desktop on any OS (Linux, macOS, Windows) to minimize to tray or shrink to Mini-HUD whenever you are actively editing code.

---

## 📊 Status Bar Indicators

| Indicator | State | Description |
|:---|:---|:---|
| `$(compass) 00:00 [KLAR]` | **Idle / Ready** | Timer is ready. |
| `$(watch) 28:45 [FOKUS]` | **Flow / Focus** | Active count-up session. Riding the momentum wave. |
| `$(coffee) 09:30 [PAUSE]` | **Earned Rest** | Proportional break countdown. Step away guilt-free. |
| `$(zap) 04:15 [5M MIKRO]` | **Micro-Start** | 5-minute low-stakes session to beat initiation friction. |

> **Pro Tip:** Click the status bar widget anytime to open the **Tether Hub** quick menu!

---

## ⌨️ Commands

Access via Command Palette (`Ctrl+Shift+P` on Linux/Windows, `Cmd+Shift+P` on macOS):

- `Tether: Open Tether Hub` — Quick control menu for Focus, Micro-Start, RAM-Dumps, Impulses, and Shutdown.
- `Tether: Start / Pause Flow (Flowmodoro)` — Toggle your focus or earned break.
- `Tether: 5m Micro-Start (Break Initiation Barrier)` — Launch a 5-minute micro-start.
- `Tether: Reset Flowmodoro Timer` — Reset the Flowmodoro timer back to Idle.
- `Tether: Working Memory / RAM-Dumps (Create / Edit / Delete)` — Manage structured working memory save-states with auto-fill.
- `Tether: Park Impulse / Side-Quest` — Offload racing thoughts immediately to `impulses.md` (alias: `Tether: Rapid RAM Dump`).
- `Tether: Evening Shutdown Ritual` — End the workday cleanly and park tomorrow's first micro-step.
- `Tether: Open Tether Desktop` — Bring up the full Tether desktop companion.

---

## ⚙️ Configuration

Customize Tether in your VS Code `settings.json`:

```json
{
  // Automatically record active file, cursor position, and git branch
  "tether.autoAnchor": true,

  // Display the live Flowmodoro widget in the status bar
  "tether.showStatusBar": true
}
```

---

## 🔄 Cross-App Ecosystem

Tether is built as a unified neurodivergent companion across your entire workflow:
- **[Tether Desktop](https://github.com/Phrozenn1/tether-desktop)**: System tray / Mini-HUD companion, focus soundscapes (40 Hz Gamma entrainment, Brown/Pink/Green noise, authentic nature field recordings), AI-assisted RAM-dumps, Dopamine Menu, Yak-Alarm / Speedbump, Time Anchor, and Shutdown Ritual.
- **[tether.nvim](https://github.com/Phrozenn1/tether.nvim)**: Pure Lua plugin for Neovim with floating HUD, context anchor, and 1-click terminal resume.
- **[tether-obsidian](https://github.com/Phrozenn1/tether-obsidian)**: Native Obsidian plugin with Flowmodoro status bar, note/heading anchoring, RAM-dump CRUD manager, and Shutdown Ritual.
- **[tether-vscode](https://github.com/Phrozenn1/tether-vscode)**: This extension!

All four share state seamlessly via local IPC files (`~/.local/state/tether/` on Linux, `%LOCALAPPDATA%/tether/` on Windows, `~/Library/Application Support/tether/` on macOS).

---

## 🔬 Scientific Foundation

Tether is engineered from peer-reviewed research in cognitive neuroscience, ADHD, Autism, Dyslexia, and Universal Cognitive Ergonomics:
- 👉 [**`RESEARCH.md` — Scientific Rationale & Neurodivergent Research Foundation**](https://github.com/Phrozenn1/tether-desktop/blob/main/RESEARCH.md)

---

## 🇳🇴 Norsk sammendrag

Tether for VS Code gir deg ADHD-tilpasset tidsstyring og reduserer overgangsfriksjon ved koding:
- **Flowmodoro**: Tell oppover så lenge du har god flyt, og opptjen en velfortjent pause i stedet for å bli avbrutt av rigide 25-minutters alarmer.
- **Automatisk Save-State**: Husker nøyaktig hvilken fil, linje og branch du forlot.
- **Mikro-start & RAM-dump**: Bryt dørstokkmila med 5 minutter, og parkér distraherende impulser rett fra editoren.

---

## 📄 License

[GPL-2.0](LICENSE) © [Phrozenn1](https://github.com/Phrozenn1)
