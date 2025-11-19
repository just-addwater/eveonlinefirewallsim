/**
 * EVE Online Firewalling Simulator - HUD Manager
 * Updates all HUD elements with game state
 */

import { Utils } from './Utils.js';

export class HUD {
    constructor() {
        this.elements = {
            shieldBar: document.getElementById('shield-bar'),
            shieldValue: document.getElementById('shield-value'),
            armorBar: document.getElementById('armor-bar'),
            armorValue: document.getElementById('armor-value'),
            capBar: document.getElementById('cap-bar'),
            capValue: document.getElementById('cap-value'),

            smartbombStatus: document.getElementById('smartbomb-status'),
            smartbombState: document.getElementById('smartbomb-state'),
            abStatus: document.getElementById('ab-status'),
            abState: document.getElementById('ab-state'),
            mwdStatus: document.getElementById('mwd-status'),
            mwdState: document.getElementById('mwd-state'),

            overviewTable: document.getElementById('overview-tbody'),
            overviewToggle: document.getElementById('overview-toggle'),
            overviewContent: document.getElementById('overview-content'),

            missilesLaunched: document.getElementById('missiles-launched'),
            missilesDestroyed: document.getElementById('missiles-destroyed'),
            efficiency: document.getElementById('efficiency'),
            smartbombCycles: document.getElementById('smartbomb-cycles'),
            efficiencyFill: document.getElementById('efficiency-fill'),
            currentTip: document.getElementById('current-tip'),

            speedValue: document.getElementById('speed-value'),

            radialMenu: document.getElementById('radial-menu'),
            helpToggle: document.getElementById('help-toggle'),
            helpContent: document.getElementById('help-content')
        };

        this.tips = [
            "Position between fleet and enemies for optimal coverage",
            "Use Afterburner for sustained positioning without signature bloom",
            "MWD provides quick repositioning but increases your signature by 500%",
            "Time smartbomb activations to catch missile volleys as they approach",
            "Watch enemy ship movements to anticipate missile launches",
            "Aim for 70%+ firewalling efficiency for effective protection",
            "Smartbombs have a 3-second cycle time - plan your activations",
            "Managing capacitor is crucial - don't run out during critical moments",
            "Position perpendicular to missile trajectory for maximum coverage"
        ];

        this.currentTipIndex = 0;
        this.frameCounter = 0;
        this.setupEventListeners();

        setInterval(() => this.rotateTip(), 15000);
    }

    setupEventListeners() {
        this.elements.overviewToggle.addEventListener('click', () => {
            this.elements.overviewContent.classList.toggle('collapsed');
            this.elements.overviewToggle.textContent =
                this.elements.overviewContent.classList.contains('collapsed') ? '▶' : '▼';
        });

        this.elements.helpToggle.addEventListener('click', () => {
            this.elements.helpContent.classList.toggle('hidden');
        });

        document.querySelectorAll('.radial-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                window.dispatchEvent(new CustomEvent('radialMenuAction', { detail: action }));
                this.hideRadialMenu();
            });
        });
    }

    update(battleship, enemies, missiles, stats) {
        // Throttle updates to every 3rd frame for performance
        if (!this.frameCounter) this.frameCounter = 0;
        this.frameCounter++;
        if (this.frameCounter % 3 !== 0) return;

        const status = battleship.getStatus();

        this.updateBar(this.elements.shieldBar, this.elements.shieldValue, status.shield);
        this.updateBar(this.elements.armorBar, this.elements.armorValue, status.armor);
        this.updateBar(this.elements.capBar, this.elements.capValue, status.capacitor);

        this.updateModuleStatus(
            this.elements.smartbombStatus,
            this.elements.smartbombState,
            status.smartbomb.isCycling,
            status.smartbomb.isCycling ? 'CYCLING' : 'OFFLINE'
        );

        this.updateModuleStatus(
            this.elements.abStatus,
            this.elements.abState,
            status.afterburnerActive,
            status.afterburnerActive ? 'ACTIVE' : 'OFFLINE'
        );

        this.updateModuleStatus(
            this.elements.mwdStatus,
            this.elements.mwdState,
            status.mwdActive,
            status.mwdActive ? `ACTIVE (${Math.ceil(status.mwdCycleRemaining / 1000)}s)` : 'OFFLINE'
        );

        this.updateOverview(battleship, enemies, missiles);
        this.updateStatistics(stats);
        this.elements.speedValue.textContent = Math.round(status.velocity) + ' m/s';
    }

    updateBar(barElement, valueElement, percentage) {
        const clamped = Math.max(0, Math.min(100, percentage));
        barElement.style.width = clamped + '%';
        valueElement.textContent = Math.round(clamped) + '%';
    }

    updateModuleStatus(moduleElement, stateElement, isActive, stateText) {
        if (isActive) {
            moduleElement.classList.add('active');
            stateElement.classList.remove('offline');
            stateElement.classList.add('online');
        } else {
            moduleElement.classList.remove('active');
            stateElement.classList.remove('online');
            stateElement.classList.add('offline');
        }
        stateElement.textContent = stateText;
    }

    updateOverview(battleship, enemies, missiles) {
        const tbody = this.elements.overviewTable;
        tbody.innerHTML = '';

        enemies.forEach(enemy => {
            const info = enemy.getInfo();
            const row = this.createOverviewRow(info, 'enemy');
            tbody.appendChild(row);
        });

        const activeMissiles = missiles.filter(m => m.alive).slice(-20);
        activeMissiles.forEach(missile => {
            const info = missile.getInfo();
            const row = this.createOverviewRow(info, 'missile');
            tbody.appendChild(row);
        });
    }

    createOverviewRow(info, type) {
        const row = document.createElement('tr');
        row.classList.add(type);

        row.innerHTML = `
            <td>${info.name}</td>
            <td>${Utils.formatDistance(info.distance)}</td>
            <td>${Math.round(info.velocity)} m/s</td>
            <td>${info.type}</td>
        `;

        return row;
    }

    updateStatistics(stats) {
        this.elements.missilesLaunched.textContent = stats.missilesLaunched;
        this.elements.missilesDestroyed.textContent = stats.missilesDestroyed;
        this.elements.smartbombCycles.textContent = stats.smartbombCycles;

        const efficiency = stats.missilesLaunched > 0
            ? (stats.missilesDestroyed / stats.missilesLaunched * 100)
            : 0;

        this.elements.efficiency.textContent = efficiency.toFixed(1) + '%';
        this.elements.efficiencyFill.style.width = Math.min(100, efficiency) + '%';
    }

    rotateTip() {
        this.currentTipIndex = (this.currentTipIndex + 1) % this.tips.length;
        this.elements.currentTip.textContent = this.tips[this.currentTipIndex];
    }

    showRadialMenu(x, y) {
        this.elements.radialMenu.style.left = x + 'px';
        this.elements.radialMenu.style.top = y + 'px';
        this.elements.radialMenu.classList.remove('hidden');
    }

    hideRadialMenu() {
        this.elements.radialMenu.classList.add('hidden');
    }
}