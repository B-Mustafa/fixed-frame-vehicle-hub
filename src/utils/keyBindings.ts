interface KeyBinding {
    id: string;
    description: string;
    key: string;
    handler: (e?: KeyboardEvent) => void;
  }
  
  const activeBindings = new Map<string, KeyBinding>();
  let isInitialized = false;
  
  export const registerKeyBindings = (bindings: KeyBinding[]) => {
    // Clear previous bindings
    unregisterKeyBindings();
  
    // Register new bindings
    bindings.forEach(binding => {
      activeBindings.set(binding.id, binding);
    });
  
    if (!isInitialized) {
      document.addEventListener('keydown', handleGlobalKeyDown);
      isInitialized = true;
    }
  };
  
  export const unregisterKeyBindings = () => {
    activeBindings.clear();
  };
  
  const handleGlobalKeyDown = (e: KeyboardEvent) => {
    // Don't trigger if focused on input elements
    const target = e.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) {
      return;
    }
  
    // Check each binding
    for (const [_, binding] of activeBindings) {
      if (matchesKeyBinding(e, binding.key)) {
        e.preventDefault();
        binding.handler(e);
        break; // Only trigger one binding per keypress
      }
    }
  };
  
  export const matchesKeyBinding = (e: KeyboardEvent, keyCombo: string): boolean => {
    const parts = keyCombo.split('+');
    const modifiers = parts.slice(0, -1);
    const key = parts[parts.length - 1];
  
    // Check modifiers
    const expectedModifiers = {
      ctrl: modifiers.includes('Ctrl'),
      shift: modifiers.includes('Shift'),
      alt: modifiers.includes('Alt'),
      meta: modifiers.includes('Meta')
    };
  
    if (
      expectedModifiers.ctrl !== e.ctrlKey ||
      expectedModifiers.shift !== e.shiftKey ||
      expectedModifiers.alt !== e.altKey ||
      expectedModifiers.meta !== e.metaKey
    ) {
      return false;
    }
  
    // Check main key
    const normalizedKey = key.toLowerCase();
    const normalizedEventKey = e.key.toLowerCase();
  
    // Handle special keys
    const specialKeys: Record<string, string> = {
      '↑': 'arrowup',
      '↓': 'arrowdown',
      '←': 'arrowleft',
      '→': 'arrowright',
      'esc': 'escape',
      'del': 'delete',
      'space': ' ',
      'pageup': 'pageup',
      'pagedown': 'pagedown',
      'home': 'home',
      'end': 'end'
    };
  
    const expectedKey = specialKeys[normalizedKey] || normalizedKey;
    const actualKey = specialKeys[normalizedEventKey] || normalizedEventKey;
  
    return expectedKey === actualKey;
  };
  
  export const loadKeyBindings = (): KeyBinding[] => {
    try {
      const saved = localStorage.getItem('app_keybinds');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to load keybindings:', e);
      return null;
    }
  };