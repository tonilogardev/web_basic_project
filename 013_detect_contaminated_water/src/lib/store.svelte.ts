import type { BasemapKey } from './mapStyles';

export type UserTier = 'freemium' | 'pro' | 'enterprise';

export interface UserProfile {
  name: string;
  email: string;
  tier: UserTier;
  createdAt: string;
}

class AppStore {
  isUserModalOpen = $state(false);
  activeUser = $state<UserProfile | null>(null);
  coords = $state({ lng: 1.74, lat: 41.69, zoom: 8 });
  currentBasemap = $state<BasemapKey>('esritopo');
  notification = $state<{ text: string; type: 'info' | 'success' | 'warn' } | null>(null);

  setBasemap(style: BasemapKey) {
    this.currentBasemap = style;
  }

  openUserModal() {
    this.isUserModalOpen = true;
  }

  closeUserModal() {
    this.isUserModalOpen = false;
  }

  createUser(profile: Omit<UserProfile, 'createdAt'>) {
    this.activeUser = {
      ...profile,
      createdAt: new Date().toISOString(),
    };
    this.isUserModalOpen = false;
    this.showNotification(`Usuario "${profile.name}" creado con éxito (${profile.tier.toUpperCase()})`, 'success');
  }

  showNotification(text: string, type: 'info' | 'success' | 'warn' = 'info') {
    this.notification = { text, type };
    setTimeout(() => {
      if (this.notification?.text === text) {
        this.notification = null;
      }
    }, 4500);
  }
}

export const store = new AppStore();
