import { LitElement, html } from './lit-core.min.js';
import { ELEMENTS, CATEGORIES, ORBITAL_MARGINS, ORBITAL_DURATIONS } from './elements.js';

const SKIP = new Set(['col', 'row', 'category', 'shells', 'number', 'summary']);

function fmtKey(k) {
  return k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function spanWidth(rawStr) {
  const len = String(rawStr).length;
  return len <= 10 ? 1 : len <= 25 ? 2 : len <= 60 ? 3 : len <= 120 ? 4 : 5;
}

// ── ElementDetail ────────────────────────────────────────────────────────────

class ElementDetail extends LitElement {
  static properties = {
    data: { type: Object }
  };

  createRenderRoot() { return this; }

  _fmtValue(k, v) {
    if (k === 'cpk_hex') {
      return html`
        <span style="display:inline-block;width:0.9em;height:0.9em;background:#${v};
                     border:1px solid rgba(255,255,255,0.3);vertical-align:middle;
                     margin-right:0.3em"></span>#${v}`;
    }
    if (k === 'source') {
      return html`<a href="${v}" target="_blank"
                     style="color:inherit;opacity:0.7;word-break:break-all">${v}</a>`;
    }
    if (Array.isArray(v)) return v.join(', ');
    return String(v);
  }

  _cards() {
    const cards = [];
    for (const [k, v] of Object.entries(this.data)) {
      if (SKIP.has(k) || v === null || v === undefined) continue;

      if (typeof v === 'object' && !Array.isArray(v)) {
        const rows = Object.entries(v).filter(([, sv]) => sv !== null && sv !== undefined);
        cards.push(html`
          <div class="detail-card w2">
            <div class="lbl">${fmtKey(k)}</div>
            <table class="val-table">
              ${rows.map(([sk, sv]) => html`
                <tr>
                  <td>${fmtKey(sk)}</td>
                  <td>${Array.isArray(sv) ? sv.join(', ') : String(sv)}</td>
                </tr>`)}
            </table>
          </div>`);
      } else {
        const rawForLen = Array.isArray(v) ? v.join(', ') : String(v);
        cards.push(html`
          <div class="detail-card w${spanWidth(rawForLen)}">
            <div class="lbl">${fmtKey(k)}</div>
            <div class="val">${this._fmtValue(k, v)}</div>
          </div>`);
      }
    }
    return cards;
  }

  render() {
    if (!this.data) return html``;
    return html`
      <div class="summary"></div>
      <div class="detail-cards">${this._cards()}</div>
    `;
  }

  // summary contains trusted multi-paragraph HTML from the element data —
  // set via innerHTML after render since unsafeHTML requires an extra Lit bundle
  updated() {
    const el = this.querySelector('.summary');
    if (el) el.innerHTML = this.data?.summary ?? '';
  }
}
customElements.define('element-detail', ElementDetail);

// ── PeriodicElement ──────────────────────────────────────────────────────────

class PeriodicElement extends LitElement {
  static properties = {
    data: { type: Object },
    active: { type: Boolean }
  };

  createRenderRoot() { return this; }

  render() {
    if (!this.data) return html``;
    const { category, col, row, atomic_number, symbol, name, atomic_mass, electrons_per_shell } = this.data;
    const electrons = electrons_per_shell;

    this.className = `element ${category} c${col} r${row}${this.active ? ' active' : ''}`;
    this.style.gridColumn = col;
    this.style.gridRow = row;

    return html`
      <div class="overlay" @click=${this._onDeactivate}></div>
      <div class="square" @click=${this._onActivate}>
        <div class="model">
          ${electrons.map((count, i) => html`
            <div class="orbital"
                 style="margin: ${ORBITAL_MARGINS[i]}%; animation-duration: ${ORBITAL_DURATIONS[i]}s">
              ${Array.from({ length: count }, (_, j) => html`
                <div class="electron"
                     style="transform:rotate(${(360 / count) * j}deg)"></div>
              `)}
            </div>
          `)}
        </div>
        <div class="atomic-number">${atomic_number}</div>
        <div class="label">
          <div class="symbol">${symbol}</div>
          <div class="name">${name}</div>
        </div>
        <div class="atomic-mass">(${atomic_mass})</div>
        <ul class="atomic-weight">${electrons.map(n => html`<li>${n}</li>`)}</ul>
      </div>
    `;
  }

  _onActivate() {
    this.dispatchEvent(new CustomEvent('element-activate', { bubbles: true, composed: true }));
  }

  _onDeactivate() {
    this.dispatchEvent(new CustomEvent('element-deactivate', { bubbles: true, composed: true }));
  }
}
customElements.define('periodic-element', PeriodicElement);

// ── PeriodicTable ────────────────────────────────────────────────────────────

class PeriodicTable extends LitElement {
  static properties = {
    _activeData: { state: true }
  };

  createRenderRoot() { return this; }

  render() {
    return html`
      <div class="wrapper">
        ${CATEGORIES.map(({ id }) => html`
          <input class="category-toggle" type="radio" id="${id}" name="categories" />
          <input class="category-cancel" id="cancel" type="radio" name="categories" />
        `)}
        <div class="periodic-table"
          @element-activate=${this._onActivate}
          @element-deactivate=${this._onDeactivate}
        >
          ${ELEMENTS.map(data => html`
            <periodic-element
              .data=${data}
              .active=${this._activeData === data}
            ></periodic-element>
          `)}
          <div class="placeholder lanthanoid" style="grid-column: 3; grid-row: 6">
            <div class="square">57-71</div>
          </div>
          <div class="placeholder actinoid" style="grid-column: 3; grid-row: 7">
            <div class="square">89-103</div>
          </div>
          <div class="gap" style="grid-column: 3; grid-row: 8"></div>
          <div class="key">
            <div class="row">
              ${CATEGORIES.map(({ id, cls, label }) => html`
                <label class="${cls}" for="${id}">${label}</label>
              `)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _onActivate(e) {
    const data = e.target.data;
    if (this._activeData === data) {
      this._deactivate();
    } else {
      this._activeData = data;
      document.getElementById('detail-panel').data = data;
    }
  }

  _onDeactivate() {
    this._deactivate();
  }

  _deactivate() {
    this._activeData = null;
    document.getElementById('detail-panel').data = null;
  }
}
customElements.define('periodic-table', PeriodicTable);
