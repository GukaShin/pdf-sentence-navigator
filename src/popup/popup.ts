import './popup.css';
import { isEnabled, setEnabled } from '../core/settings';

async function init(): Promise<void> {
  const toggle = document.getElementById('toggle-enabled');
  if (!(toggle instanceof HTMLInputElement)) return;

  toggle.checked = await isEnabled();
  toggle.addEventListener('change', () => {
    void setEnabled(toggle.checked);
  });
}

void init();
