/* @ds-bundle: {"format":4,"namespace":"Esgode","components":[{"name":"Button"},{"name":"Icon"},{"name":"TextField"},{"name":"SegmentedControl"},{"name":"Toggle"},{"name":"Badge"},{"name":"StatCard"},{"name":"Avatar"},{"name":"SidebarNav"},{"name":"DataTable"}]} */
(function () {
  var React = window.React;
  if (!React) { window.Esgode = {}; return; }
  var h = React.createElement;

  function cx() {
    var out = [];
    for (var i = 0; i < arguments.length; i++) if (arguments[i]) out.push(arguments[i]);
    return out.join(' ');
  }

  /* ---------- Icon (placeholder glyphs; see README › Iconography) ---------- */
  var PATHS = {
    search: 'M10.5 3a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Zm6.3 10.4 4.2 4.2-1.4 1.4-4.2-4.2 1.4-1.4Z',
    person: 'M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-7a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm-8 15c0-3.9 3.6-6 8-6s8 2.1 8 6v1H4v-1Zm2.1-1h11.8c-.5-1.9-2.8-3-5.9-3s-5.4 1.1-5.9 3Z',
    cart: 'M3 4h2.4l1.2 2H21l-2.2 8H8.3l.5 2H19v2H7.2L4.2 6H3V4Zm4.8 4 1 4h8.5l1.1-4H7.8ZM9 19.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm8 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z',
    chat: 'M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4V5a1 1 0 0 1 1-1Zm1 2v11l3-2.4V15h11V6H5Z',
    chart: 'M4 20V10h3v10H4Zm6.5 0V4h3v16h-3ZM17 20v-7h3v7h-3Z',
    box: 'M12 2.5 21 7v10l-9 4.5L3 17V7l9-4.5Zm0 2.2L5.9 7.8 12 10.9l6.1-3.1L12 4.7ZM5 9.3v6.5l6 3V12.3l-6-3Zm14 0-6 3v6.5l6-3V9.3Z',
    plus: 'M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4Z',
    check: 'M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 12-12-1.4-1.4-10.6 10.6Z',
    chevron: 'M9.3 5.3 16 12l-6.7 6.7-1.4-1.4L13.2 12 7.9 6.7l1.4-1.4Z',
    home: 'M12 3l9 8h-2.5v9h-5v-6h-3v6h-5v-9H3l9-8Z',
    instagram: 'M7.5 2.5h9A5 5 0 0 1 21.5 7.5v9a5 5 0 0 1-5 5h-9a5 5 0 0 1-5-5v-9a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3h-9ZM12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm0 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm5-3.3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4Z',
    whatsapp: 'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 2a7 7 0 1 1-3.6 13l-.4-.2-2.6.7.7-2.5-.3-.4A7 7 0 0 1 12 5Zm-2.8 2.5c.2 0 .4.1.5.3l.9 2c.1.2 0 .4-.1.6l-.7.8c.6 1.2 1.6 2.2 2.8 2.8l.8-.7c.2-.1.4-.2.6-.1l2 .9c.2.1.3.3.3.5v1.4c0 .6-.5 1-1 1-4.5-.3-8-3.8-8.3-8.3 0-.6.4-1 1-1h1.2Z'
  };
  function Icon(props) {
    var name = props.name, size = props.size || 'md', className = props.className;
    var d = PATHS[name] || PATHS.box;
    return h('svg', {
      className: cx('es-icon', size === 'lg' && 'es-icon--lg', (name === 'instagram' || name === 'whatsapp') && 'es-icon--' + name, className),
      viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': props.label ? undefined : 'true', role: props.label ? 'img' : undefined
    }, props.label ? h('title', null, props.label) : null, h('path', { d: d }));
  }

  /* ---------- Button ---------- */
  function Button(props) {
    var variant = props.variant || 'primary', size = props.size || 'md';
    var iconOnly = props.icon && !props.children;
    return h('button', {
      type: props.type || 'button',
      className: cx('es-btn', 'es-btn--' + variant, 'es-btn--' + size, props.pill && 'es-btn--pill', iconOnly && 'es-btn--icon-only', props.className),
      disabled: props.disabled, onClick: props.onClick, 'aria-label': iconOnly ? props.label : undefined, title: iconOnly ? props.label : undefined
    }, props.icon ? h(Icon, { name: props.icon }) : null, props.children);
  }

  /* ---------- TextField ---------- */
  function TextField(props) {
    var id = props.id || ('es-f-' + Math.random().toString(36).slice(2, 8));
    return h('div', { className: cx('es-field', props.outlined && 'es-field--outlined', props.error && 'es-field--error', props.disabled && 'es-field--disabled', props.className) },
      props.label ? h('label', { className: 'es-field__label', htmlFor: id }, props.label) : null,
      h('div', { className: 'es-field__control' },
        props.leading ? h('span', { className: 'es-field__leading' }, typeof props.leading === 'string' ? h(Icon, { name: props.leading }) : props.leading) : null,
        h('input', {
          id: id, className: 'es-field__input', type: props.type || 'text', placeholder: props.placeholder,
          value: props.value, defaultValue: props.defaultValue, onChange: props.onChange, disabled: props.disabled,
          'aria-invalid': props.error ? 'true' : undefined, 'aria-describedby': (props.hint || props.error) ? id + '-hint' : undefined
        })),
      (props.error || props.hint) ? h('div', { className: 'es-field__hint', id: id + '-hint' }, props.error || props.hint) : null);
  }

  /* ---------- SegmentedControl ---------- */
  function SegmentedControl(props) {
    var options = props.options || [];
    return h('div', { className: cx('es-seg', props.className), role: 'radiogroup', 'aria-label': props.label },
      options.map(function (o) {
        var on = o.value === props.value;
        return h('button', {
          key: o.value, type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false', className: 'es-seg__opt',
          onClick: function () { if (props.onChange) props.onChange(o.value); }
        }, o.label, o.count != null ? h('span', { className: 'es-seg__count' }, o.count) : null);
      }));
  }

  /* ---------- Toggle ---------- */
  function Toggle(props) {
    return h('label', { className: cx('es-toggle', props.checked && 'es-toggle--on', props.disabled && 'es-toggle--disabled', props.className) },
      h('input', { type: 'checkbox', role: 'switch', checked: !!props.checked, disabled: props.disabled, 'aria-checked': props.checked ? 'true' : 'false',
        onChange: function (e) { if (props.onChange) props.onChange(e.target.checked); } }),
      h('span', { className: 'es-toggle__track' }, h('span', { className: 'es-toggle__knob' })),
      props.label ? h('span', null, props.label) : null);
  }

  /* ---------- Badge ---------- */
  function Badge(props) {
    return h('span', { className: cx('es-badge', 'es-badge--' + (props.tone || 'neutral'), props.className) },
      props.dot ? h('span', { className: 'es-badge__dot', 'aria-hidden': 'true' }) : null, props.children);
  }

  /* ---------- StatCard ---------- */
  function StatCard(props) {
    var tone = props.deltaTone || (props.delta && props.delta.charAt(0) === '-' ? 'down' : props.delta ? 'up' : 'flat');
    return h('div', { className: cx('es-card', 'es-stat', props.className) },
      h('div', { className: 'es-stat__label' }, props.label),
      h('div', { className: 'es-stat__value' }, props.value),
      (props.delta || props.hint) ? h('div', { className: 'es-stat__foot' },
        props.delta ? h('span', { className: 'es-stat__delta es-stat__delta--' + tone }, props.delta) : null,
        props.hint ? h('span', null, props.hint) : null) : null);
  }

  /* ---------- Avatar ---------- */
  function initials(name) {
    var p = String(name || '').trim().split(/\s+/).filter(Boolean);
    return ((p[0] || '').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
  }
  function Avatar(props) {
    return h('span', { className: cx('es-avatar', 'es-avatar--' + (props.size || 'md'), props.className), title: props.name, 'aria-label': props.name, role: 'img' },
      props.src ? h('img', { src: props.src, alt: '' }) : initials(props.name));
  }

  /* ---------- SidebarNav ---------- */
  function SidebarNav(props) {
    var items = props.items || [];
    return h('nav', { className: cx('es-side', props.className), 'aria-label': props.label || 'Navegación' },
      h('div', { className: 'es-side__brand' }, props.logo ? h('img', { className: 'es-side__logo', src: props.logo, alt: '' }) : null, props.brand || 'Esgode'),
      items.map(function (it, i) {
        if (it.section) return h('div', { key: 's' + i, className: 'es-side__section' }, it.section);
        var active = it.id === props.activeId;
        return h('button', {
          key: it.id, type: 'button', className: cx('es-side__item', active && 'es-side__item--active'), 'aria-current': active ? 'page' : undefined,
          onClick: function () { if (props.onSelect) props.onSelect(it.id); }
        }, it.icon ? h(Icon, { name: it.icon }) : null, h('span', { className: 'es-side__label' }, it.label),
          it.count != null ? h('span', { className: 'es-side__count' }, it.count) : null);
      }),
      props.user ? h('div', { className: 'es-side__footer' },
        h(Avatar, { name: props.user.name, src: props.user.src, size: 'md' }),
        h('div', null, h('div', { className: 'es-side__footer-name' }, props.user.name), props.user.role ? h('div', { className: 'es-side__footer-role' }, props.user.role) : null)) : null);
  }

  /* ---------- DataTable ---------- */
  function DataTable(props) {
    var cols = props.columns || [], rows = props.rows || [];
    var keyOf = function (r, i) { return props.rowKey ? r[props.rowKey] : i; };
    return h('div', { className: cx('es-table-wrap', props.className) },
      h('table', { className: cx('es-table', props.onRowClick && 'es-table--clickable') },
        h('thead', null, h('tr', null, cols.map(function (c) {
          return h('th', { key: c.key, className: c.align === 'right' ? 'es-align-right' : undefined, style: c.width ? { width: c.width } : undefined }, c.label);
        }))),
        h('tbody', null, rows.length === 0
          ? h('tr', null, h('td', { colSpan: cols.length }, h('div', { className: 'es-table__empty' }, props.emptyText || 'Sin resultados')))
          : rows.map(function (r, i) {
            var k = keyOf(r, i);
            return h('tr', { key: k, className: cx(k === props.selectedKey && 'es-table__row--selected'),
              onClick: props.onRowClick ? function () { props.onRowClick(r); } : undefined },
              cols.map(function (c) {
                return h('td', { key: c.key, className: cx(c.align === 'right' && 'es-align-right', c.mono && 'es-data') }, c.render ? c.render(r) : r[c.key]);
              }));
          }))));
  }

  window.Esgode = {
    Button: Button, Icon: Icon, TextField: TextField, SegmentedControl: SegmentedControl, Toggle: Toggle,
    Badge: Badge, StatCard: StatCard, Avatar: Avatar, SidebarNav: SidebarNav, DataTable: DataTable
  };
})();
