<div align="center">

# Claude Code Dashboard

**Integrez Claude Code CLI directement dans la barre laterale d'Obsidian.**

Discutez, codez et automatisez — sans quitter votre vault.

[English](../README.md) | [日本語](README.ja.md) | [中文](README.zh.md) | **Français**

[![GitHub stars](https://img.shields.io/github/stars/shimayuz/claudecode-plugin?style=social)](https://github.com/shimayuz/claudecode-plugin)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/shimayuz/claudecode-plugin)](https://github.com/shimayuz/claudecode-plugin/releases)
[![Obsidian](https://img.shields.io/badge/Obsidian-1.4.0+-7C3AED)](https://obsidian.md)

![Claude Code Dashboard](screenshot.png)

</div>

---

## Pourquoi Claude Code Dashboard ?

Si vous utilisez deja **Claude Code CLI**, vous connaissez sa puissance. Mais basculer entre votre terminal et Obsidian brise votre flux de travail. Claude Code Dashboard resout ce probleme en integrant l'experience complete de Claude Code dans la barre laterale d'Obsidian.

| Sans ce plugin | Avec Claude Code Dashboard |
|---|---|
| Basculer entre le terminal et Obsidian | Discuter avec Claude directement dans la barre laterale |
| Copier manuellement les chemins de fichiers | Attacher des fichiers du vault via un selecteur flou |
| Gerer les sessions tmux dans un terminal separe | Surveiller les sessions tmux dans un tableau de bord dedie |
| Suivre les scripts d'automatisation en externe | Visualiser tous les processus `claude -p` et taches cron en un seul endroit |
| Pas de revue de diff en ligne | Accepter/rejeter les modifications de code avec les diffs CodeMirror 6 |

**Zero cout supplementaire** — utilise votre abonnement Claude Code CLI existant. Aucune cle API necessaire.

---

## Fonctionnalites

### Chat

- **Claude Code complet dans votre barre laterale** — Reponses en streaming, rendu Markdown et blocs de code avec coloration syntaxique
- **Selecteur de modele** — Choisissez entre Opus 1M, Opus, Sonnet et Haiku avec des niveaux d'effort configurables (Low / Med / High / Max)
- **Mode Plan First** — Activez le mode planification pour que Claude esquisse son approche avant d'executer
- **Mode Thinking** — Activez la reflexion etendue pour un raisonnement plus approfondi
- **Commandes slash** — Decouverte automatique de toutes les commandes depuis `~/.claude/commands/` et `~/.claude/skills/` (277+ commandes)
- **Pieces jointes** — Attachez des fichiers du vault via le selecteur flou, les `@mentions`, ou collez/deposez des images directement
- **Controles de permissions** — Modes Default, Accept Edits ou Bypass All pour les approbations d'outils
- **Historique des sessions** — Stockage persistant des sessions avec relecture complete des conversations
- **Support IME japonais** — Entree confirme la composition d'entree sans envoyer le message

### Tableaux de bord

- **Tableau de bord tmux** — Surveillez les sessions tmux actives et identifiez celles qui executent des processus Claude
- **Tableau de bord d'automatisation** — Suivez les processus `claude -p` et les taches cron planifiees en un coup d'oeil

### Integration editeur

- **Diff en ligne** — Vue diff propulsee par CodeMirror 6 avec des controles accepter/rejeter pour chaque modification de code
- **Affichage des appels d'outils** — Visualisez les invocations des outils Read, Edit et Bash directement dans le chat

### Design

- **Theme Claude Desktop** — Theme sombre chaleureux avec fond `#2B2520` et accent terracotta `#D97757`, inspire de Claude Desktop
- **Compatible BRAT** — Installation et mise a jour en un clic via le plugin BRAT

---

## Installation rapide

### Via BRAT (Recommande)

1. Installez le plugin communautaire [BRAT](https://github.com/TfTHacker/obsidian42-brat)
2. Ouvrez les parametres BRAT et selectionnez **Add Beta Plugin**
3. Entrez l'URL du depot :
   ```
   shimayuz/claudecode-plugin
   ```
4. Cliquez sur **Add Plugin** et activez **Claude Code Dashboard** dans les plugins communautaires

### Installation manuelle

1. Telechargez `main.js`, `manifest.json` et `styles.css` depuis la [derniere version](https://github.com/shimayuz/claudecode-plugin/releases)
2. Creez un dossier `<votre-vault>/.obsidian/plugins/claudecode-dashboard/`
3. Copiez les fichiers telecharges dans ce dossier
4. Redemarrez Obsidian et activez **Claude Code Dashboard** dans Parametres > Plugins communautaires

---

## Prerequis

- **Obsidian** 1.4.0 ou superieur (bureau uniquement)
- **Claude Code CLI** installe et authentifie — [guide d'installation](https://docs.anthropic.com/en/docs/claude-code/overview)
- Un abonnement **Claude Code** actif (plan Max, Pro ou Team)

Verifiez que votre CLI fonctionne :

```bash
claude --version
```

---

## Utilisation

1. Ouvrez la vue **Claude Code Dashboard** depuis l'icone du ruban dans la barre laterale gauche
2. Tapez votre message dans la zone de saisie du chat et appuyez sur **Shift+Entree** pour envoyer (**Entree** pour un saut de ligne)
3. Utilisez `/` pour parcourir les commandes slash, `@` pour mentionner des fichiers du vault, ou le bouton piece jointe pour selectionner des fichiers
4. Basculez le mode **Plan First** ou **Thinking** depuis la barre d'outils de l'en-tete du chat
5. Changez de modele avec le menu deroulant du selecteur de modele
6. Ouvrez les onglets **tmux** ou **Automation** pour surveiller les processus en arriere-plan

---

## Configuration

Ouvrez **Parametres > Claude Code Dashboard** pour personnaliser :

| Parametre | Description | Valeur par defaut |
|---|---|---|
| Chemin CLI | Chemin vers l'executable `claude` | `claude` |
| Repertoire de travail | Repertoire de travail par defaut pour les sessions | Racine du vault |
| Modele par defaut | Opus 1M / Opus / Sonnet / Haiku | Sonnet |
| Mode de permissions | Default / Accept Edits / Bypass All | Accept Edits |
| Autoriser les requetes web | Approuver automatiquement WebFetch, WebSearch, curl, python3 | Desactive |
| Afficher les appels d'outils | Afficher les panneaux Read, Edit, Bash dans le chat | Active |
| Afficher les couts | Afficher l'utilisation des tokens et le cout dans la barre de contexte | Active |
| Plan First par defaut | Activer le mode Plan First pour les nouvelles sessions | Desactive |
| Thinking Mode par defaut | Activer la reflexion etendue par defaut | Active |
| Intervalle de sondage tmux | Frequence de verification des sessions tmux (ms) | 5000 |
| Intervalle de sondage automatisation | Frequence de verification des automatisations en cours (ms) | 10000 |

---

## Contribuer

Les etoiles, forks, issues et PRs sont tous les bienvenus !

1. Forkez ce depot
2. Creez une branche fonctionnelle : `git checkout -b feat/my-feature`
3. Effectuez vos modifications et commitez : `git commit -m "feat: add my feature"`
4. Poussez vers votre fork : `git push origin feat/my-feature`
5. Ouvrez une Pull Request

---

## Si vous trouvez ce plugin utile, merci de mettre une etoile au depot — cela aide les autres a decouvrir le projet !

---

## Licence

[MIT](../LICENSE)

---

## Liens

- **Depot** : [github.com/shimayuz/claudecode-plugin](https://github.com/shimayuz/claudecode-plugin)
- **Issues** : [github.com/shimayuz/claudecode-plugin/issues](https://github.com/shimayuz/claudecode-plugin/issues)
- **Claude Code CLI** : [docs.anthropic.com/en/docs/claude-code/overview](https://docs.anthropic.com/en/docs/claude-code/overview)
- **Obsidian** : [obsidian.md](https://obsidian.md)
- **BRAT** : [github.com/TfTHacker/obsidian42-brat](https://github.com/TfTHacker/obsidian42-brat)
