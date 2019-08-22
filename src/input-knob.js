const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: inline-block;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      touch-action: none;
      cursor: pointer;
    }
    #rotator {
      display: block;
      --angle: 0rad;
      transform: rotate(var(--angle));
      will-change: transform;
    }
  </style>
  <div id="rotator" part="rotator"><slot></slot></div>`;

const TWO_PI = 2 * Math.PI;

export default class InputKnob extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this._rotator = this.shadowRoot.getElementById('rotator');

    this._drawState = this._drawState.bind(this);
    this._onMousedown = this._onMousedown.bind(this);
    this._onMousemove = this._onMousemove.bind(this);
    this._onMouseup = this._onMouseup.bind(this);
    this._onPointerdown = this._onPointerdown.bind(this);
    this._onPointermove = this._onPointermove.bind(this);
    this._onPointerup = this._onPointerup.bind(this);
    this._onTouchend = this._onTouchend.bind(this);
    this._onTouchmove = this._onTouchmove.bind(this);
    this._onTouchstart = this._onTouchstart.bind(this);
    this._rotationStart = this._rotationStart.bind(this);
    this._rotationChange = this._rotationChange.bind(this);
    this._rotationEnd = this._rotationEnd.bind(this);
  }

  static get observedAttributes() {
    return ['value', 'scale', 'min', 'max'];
  }

  get value() {
    return this.hasAttribute('value') ? this.getAttribute('value') : 0;
  }

  set value(value) {
    this.setAttribute('value', parseFloat(value));
  }

  get scale() {
    return this.hasAttribute('scale') ? this.getAttribute('scale') : 1;
  }

  set scale(scale) {
    this.setAttribute('scale', parseFloat(scale));
  }

  get min() {
    return this.hasAttribute('min') ? this.getAttribute('min') : null;
  }

  set min(min) {
    this.setAttribute('min', parseFloat(min));
  }

  get max() {
    return this.hasAttribute('max') ? this.getAttribute('max') : null;
  }

  set max(max) {
    this.setAttribute('max', parseFloat(max));
  }

  connectedCallback() {
    if (!this._rotator.part) {
      const wrapper = document.createElement('span');

      while (this.childNodes.length > 0) {
        wrapper.appendChild(this.childNodes[0]);
      }

      wrapper.classList.add('fallback');
      this.classList.add('fallback');
      this.append(wrapper);
    }

    this._drawState();

    if ('PointerEvent' in window) {
      this.addEventListener('pointerdown', this._onPointerdown);
    } else {
      this.addEventListener('touchstart', this._onTouchstart);
      this.addEventListener('mousedown', this._onMousedown);
    }
  }

  disconnectedCallback() {
    if ('PointerEvent' in window) {
      this.removeEventListener('pointerdown', this._onPointerdown);
    } else {
      this.removeEventListener('touchstart', this._onTouchstart);
      this.removeEventListener('mousedown', this._onMousedown);
    }
  }

  attributeChangedCallback(attrName, oldVal, newVal) {
    this._angle = (TWO_PI / this.scale) * (this.value % this.scale);
    this._rotations = Math.floor(this.value / this.scale);
    this._drawState();
  }

  _drawState() {
    this._rotator.style.setProperty('--angle', `${this._angle}rad`);
  }

  _rotationStart() {
    window.oncontextmenu = () => { return false; };
    this._centerX = this.offsetLeft - this.scrollLeft + this.clientLeft + this.offsetWidth / 2;
    this._centerY = this.offsetTop - this.scrollTop + this.clientTop + this.offsetHeight / 2;
    this._initialAngle = this._angle;
    this._attemptedAngle = this._angle;
    this._attemptedRotations = this._rotations;
    this._initialTouchAngle = Math.atan2(
      this._touchY - this._centerY,
      this._touchX - this._centerX
    );

    const evt = new Event('knob-move-start', { bubbles: true });
    this.dispatchEvent(evt);
  }

  _rotationChange() {
    this._previousAttemptedAngle = this._attemptedAngle;
    this._attemptedAngle =
      this._initialAngle
      - this._initialTouchAngle
      + Math.atan2(this._touchY - this._centerY, this._touchX - this._centerX);
    this._attemptedAngle = (this._attemptedAngle + TWO_PI) % TWO_PI;

    if (this.max !== null && this.min !== null) {
      if (this._attemptedAngle < 1.57 && this._previousAttemptedAngle > 4.71) {
        this._attemptedRotations++;
      } else if (this._previousAttemptedAngle < 1.57 && this._attemptedAngle > 4.71) {
        this._attemptedRotations--;
      }
    }

    this._attemptedValue = (this._attemptedAngle / (TWO_PI / this.scale)) + (this.scale * this._attemptedRotations);

    if (
      (this.min === null || this._attemptedValue >= this.min) &&
      (this.max === null || this._attemptedValue <= this.max)
    ) {
      this._angle = this._attemptedAngle;
      this._rotations = this._attemptedRotations;
      this.value = this._attemptedValue;
    }

    const evt = new Event('knob-move-change', { bubbles: true });
    this.dispatchEvent(evt);
  }

  _rotationEnd() {
    window.oncontextmenu = null;
    const evt = new Event('knob-move-end', { bubbles: true });
    this.dispatchEvent(evt);
  }

  _onPointerdown(e) {
    e.preventDefault();
    this._touchX = e.clientX;
    this._touchY = e.clientY;

    this._rotationStart();

    this.setPointerCapture(e.pointerId);
    this.addEventListener('pointermove', this._onPointermove);
    this.addEventListener('pointerup', this._onPointerup);
    this.addEventListener('pointercancel', this._onPointerup);
  }

  _onPointermove(e) {
    e.preventDefault();
    this._touchX = e.clientX;
    this._touchY = e.clientY;
    this._rotationChange();
  }

  _onPointerup(e) {
    e.preventDefault();
    this._rotationEnd();
    this.releasePointerCapture(e.pointerId);
    this.removeEventListener('pointermove', this._onPointermove);
    this.removeEventListener('pointerup', this._onPointerup);
    this.removeEventListener('pointercancel', this._onPointerup);
  }

  _onMousedown(e) {
    this._touchX = e.clientX;
    this._touchY = e.clientY;
    this._rotationStart();
    document.addEventListener('mousemove', this._onMousemove);
    document.addEventListener('mouseup', this._onMouseup);
  }

  _onMousemove(e) {
    e.preventDefault();
    this._touchX = e.clientX;
    this._touchY = e.clientY;
    this._rotationChange();
  }

  _onMouseup(e) {
    e.preventDefault();
    document.removeEventListener('mousemove', this._onMousemove);
    document.removeEventListener('mouseup', this._onMouseup);
    this._rotationEnd();
  }

  _onTouchstart(e) {
    e.preventDefault();
    this._touchX = e.changedTouches[0].clientX;
    this._touchY = e.changedTouches[0].clientY;
    this._rotationStart();
    this.addEventListener('touchmove', this._onTouchmove);
    this.addEventListener('touchend', this._onTouchend);
    this.addEventListener('touchcancel', this._onTouchend);
  }

  _onTouchmove(e) {
    e.preventDefault();
    this._touchX = e.targetTouches[0].clientX;
    this._touchY = e.targetTouches[0].clientY;
    this._rotationChange();
  }

  _onTouchend(e) {
    e.preventDefault();
    this.removeEventListener('touchmove', this._onTouchmove);
    this.removeEventListener('touchend', this._onTouchend);
    this.removeEventListener('touchcancel', this._onTouchend);
    this._rotationEnd();
  }
}
