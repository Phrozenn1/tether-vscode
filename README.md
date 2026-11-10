# Tether for Visual Studio Code ⚓

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/Phrozenn1.tether-vscode?style=flat-square&color=22d3ee&label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=Phrozenn1.tether-vscode)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg?style=flat-square)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-Phrozenn1%2Ftether--vscode-181717?style=flat-square&logo=github)](https://github.com/Phrozenn1/tether-vscode)

> **Flowmodoro timer, automatic context save-states, and cognitive anchoring for deep work, neurodivergent minds, and focus.**  
> Seamlessly integrated with [Tether Desktop](https://github.com/Phrozenn1/tether-desktop) and [tether.nvim](https://github.com/Phrozenn1/tether.nvim).

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

### 🧠 4. Rapid RAM Dump (Park a Thought)
- Sudden distracting ideas, errands, or impulse thoughts?
- Press `Ctrl+Shift+P` -> `Tether: Rapid RAM Dump` to offload the thought straight into your persistent impulse list without opening a browser, switching workspaces, or losing your train of thought.

### 🎨 5. Live Theme Adaptive
- Fully respects your active VS Code theme colors (Omarchy, Tokyo Night, Gruvbox, Catppuccin, Default Dark+/Light+) with high-contrast text readability.

### 🌐 6. Platform-Agnostic Editor Focus Sync
- Automatically syncs window focus state (`vscode.window.onDidChangeWindowState`) to `editor_focus.json`.
- Allows Tether Desktop on any OS (Linux, macOS, Windows) to minimize to tray or shrink to Mini-HUD whenever you are actively editing code.

---

## 📊 Status Bar Indicators

| Indicator | State | Description |
|:---|:---|:---|
| `$(compass) 00:00 [KLAR]` | **Idle / Ready** | Timer is ready. Click anytime to start flow. |
| `$(watch) 28:45 [FOKUS]` | **Flow / Focus** | Active count-up session. Riding the momentum wave. |
| `$(coffee) 09:30 [PAUSE]` | **Earned Rest** | Proportional break countdown. Step away guilt-free. |
| `$(zap) 04:15 [5M MIKRO]` | **Micro-Start** | 5-minute low-stakes session to beat initiation friction. |

> **Pro Tip:** Simply click the status bar item to toggle between **Focus**, **Break**, and **Idle**!

---

## ⌨️ Commands

Access via Command Palette (`Ctrl+Shift+P` on Linux/Windows, `Cmd+Shift+P` on macOS):

- `Tether: Start / Pause Flow (Flowmodoro)` — Toggle your focus or earned break.
- `Tether: 5m Micro-Start (Break Initiation Barrier)` — Launch a 5-minute micro-start.
- `Tether: Rapid RAM Dump (Park a Distracting Thought)` — Offload racing thoughts immediately.
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

## 🔄 Cross-Editor Ecosystem

Tether is built as a unified neurodivergent companion across your entire workflow:
- **[Tether Desktop](https://github.com/Phrozenn1/tether-desktop)**: System tray widget, ambient soundscapes (binaural beats, brown noise), Yak-Alarm, and Side-Quest shield.
- **[tether.nvim](https://github.com/Phrozenn1/tether.nvim)**: Pure Lua plugin for Neovim with Lualine integration and 1-click terminal resume.
- **[tether-vscode](https://github.com/Phrozenn1/tether-vscode)**: This extension!

All three share state seamlessly via local IPC files (`~/.local/state/tether/` on Linux, `%LOCALAPPDATA%/tether/` on Windows, `~/Library/Application Support/tether/` on macOS).

---

## 🇳🇴 Norsk sammendrag

Tether for VS Code gir deg ADHD-tilpasset tidsstyring og reduserer overgangsfriksjon ved koding:
- **Flowmodoro**: Tell oppover så lenge du har god flyt, og opptjen en velfortjent pause i stedet for å bli avbrutt av rigide 25-minutters alarmer.
- **Automatisk Save-State**: Husker nøyaktig hvilken fil, linje og branch du forlot.
- **Mikro-start & RAM-dump**: Bryt dørstokkmila med 5 minutter, og parkér distraherende impulser rett fra editoren.

---

## 📄 License

MIT © [Phrozenn1](https://github.com/Phrozenn1)
