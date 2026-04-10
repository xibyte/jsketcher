import type {Group} from './Group.entity';

/**
 * Properties dialog for a Group entity.
 * Shows group info and a Remove button with confirmation.
 */
export function showGroupDialog(
  group: Group,
  callbacks: {
    onRemove: () => void;
    onClose: () => void;
  }
): HTMLDivElement {
  const panel = document.createElement('div');
  panel.style.cssText = 'position:fixed;right:10px;top:50%;transform:translateY(-50%);background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:8px;width:280px;font-family:sans-serif;font-size:12px;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <span style="font-size:14px;font-weight:bold;">${escapeHtml(group.name || group.id)}</span>
      <button id="grp-close" style="background:none;border:none;color:#aaa;cursor:pointer;font-size:16px;padding:0 4px;">&times;</button>
    </div>
    <div style="margin-bottom:10px;font-size:11px;color:#888;">
      ID: ${escapeHtml(group.id)}<br/>
      Children: ${group.children.length}
    </div>
    <div id="grp-confirm" style="display:none;margin-bottom:8px;padding:8px;background:#3a2020;border-radius:4px;">
      <div style="margin-bottom:6px;color:#e88;">Remove this group and all its surfaces?</div>
      <div style="display:flex;gap:6px;">
        <button id="grp-confirm-yes" style="flex:1;padding:5px;background:#a33;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Yes, Remove</button>
        <button id="grp-confirm-no" style="flex:1;padding:5px;background:#444;color:#ccc;border:none;border-radius:4px;cursor:pointer;">Cancel</button>
      </div>
    </div>
    <div style="display:flex;gap:6px;">
      <button id="grp-remove" style="flex:1;padding:6px;background:#533;color:#eee;border:none;border-radius:4px;cursor:pointer;">Remove Group</button>
    </div>
  `;

  document.body.appendChild(panel);

  panel.querySelector('#grp-close')!.addEventListener('click', callbacks.onClose);

  const confirmDiv = panel.querySelector('#grp-confirm') as HTMLElement;
  panel.querySelector('#grp-remove')!.addEventListener('click', () => {
    confirmDiv.style.display = 'block';
  });
  panel.querySelector('#grp-confirm-yes')!.addEventListener('click', () => {
    callbacks.onRemove();
    callbacks.onClose();
  });
  panel.querySelector('#grp-confirm-no')!.addEventListener('click', () => {
    confirmDiv.style.display = 'none';
  });

  return panel;
}

export function closeGroupDialog(panel: HTMLDivElement | null): void {
  if (panel && panel.parentNode) {
    panel.parentNode.removeChild(panel);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
