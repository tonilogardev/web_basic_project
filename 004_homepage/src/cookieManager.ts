export interface CookieConsent {
  necessary: boolean;
  analytics: boolean;
}

export class CookieManager {
  private readonly storageKey = 'user_cookie_consent';

  public init() {
    // Aplicando regla "Explicit": Sólo inyectar el DOM si es estrictamente necesario (no hay consentimiento)
    if (!this.hasConsented()) {
      this.injectBanner();
    }
  }

  private hasConsented(): boolean {
    return localStorage.getItem(this.storageKey) !== null;
  }

  private saveConsent(consent: CookieConsent) {
    // Almacenamiento JSON para escalar la estrucutra a futuro
    localStorage.setItem(this.storageKey, JSON.stringify(consent));
    
    // Dejar huella HTTP opcional para integraciones server-side
    document.cookie = "cookie_consent=true; path=/; max-age=31536000; SameSite=Lax";
    
    this.removeBanner();
  }

  private injectBanner() {
    const banner = document.createElement('div');
    banner.id = 'cookie-banner';
    banner.className = 'cookie-banner glass-panel slide-up';

    banner.innerHTML = `
      <div class="cookie-content">
        <h3>Tu Privacidad es Importante</h3>
        <p>Utilizamos cookies estrictamente necesarias para el funcionamiento técnico y analíticas opcionales para optimizar la plataforma. 
           <a href="/privacy.html" class="privacy-link">Ver Política de Privacidad</a></p>
      </div>
      <div class="cookie-actions">
        <button id="btn-reject" class="btn-secondary">Solo Necesarias</button>
        <button id="btn-accept" class="btn-primary">Aceptar Todas</button>
      </div>
    `;

    document.body.appendChild(banner);

    // Bindings de eventos desacoplados
    document.getElementById('btn-accept')?.addEventListener('click', () => {
      this.saveConsent({ necessary: true, analytics: true });
    });

    document.getElementById('btn-reject')?.addEventListener('click', () => {
      this.saveConsent({ necessary: true, analytics: false });
    });
  }

  private removeBanner() {
    const banner = document.getElementById('cookie-banner');
    if (banner) {
      // Fade out animado (Micro-interacción)
      banner.style.opacity = '0';
      banner.style.transform = 'translate(-50%, 100%)';
      setTimeout(() => banner.remove(), 400); // 400ms empata con la transición CSS
    }
  }
}
