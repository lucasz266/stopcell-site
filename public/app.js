// Stopcell Frontend Application
async function loadBusinessConfig() {
  try {
    const response = await fetch('/api/config');
    if (!response.ok) return;
    const business = await response.json();

    const cityLabel = document.querySelector('#cityLabel');
    const contactCityDisplay = document.querySelector('#contactCityDisplay');
    const footerCity = document.querySelector('#footerCity');
    if (business.city) {
      if (cityLabel) cityLabel.textContent = business.city;
      if (contactCityDisplay) contactCityDisplay.textContent = business.city;
      if (footerCity) footerCity.textContent = business.city;
    }

    const contactHoursDisplay = document.querySelector('#contactHoursDisplay');
    if (contactHoursDisplay && business.openingHours) {
      contactHoursDisplay.textContent = business.openingHours;
    }

    const phoneDisplayLabel = document.querySelector('#phoneDisplayLabel');
    if (phoneDisplayLabel && business.phoneDisplay) {
      phoneDisplayLabel.textContent = business.phoneDisplay;
    }

    const instagramHandleLabel = document.querySelector('#instagramHandleLabel');
    if (instagramHandleLabel && business.instagramHandle) {
      instagramHandleLabel.textContent = business.instagramHandle;
    }

    const igLinks = [
      document.querySelector('#instagramLink'),
      document.querySelector('#aboutInstagramLink'),
      document.querySelector('#footerInstagram')
    ];
    igLinks.forEach((el) => {
      if (el && business.instagramUrl) el.href = business.instagramUrl;
    });

    const waLinks = [
      document.querySelector('#whatsappDirect'),
      document.querySelector('#footerWhatsapp')
    ];
    waLinks.forEach((el) => {
      if (el && business.whatsappUrl) {
        el.href = business.whatsappUrl;
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
      }
    });
  } catch {
    // O site permanece 100% funcional mesmo offline ou sem API.
  }
}

loadBusinessConfig();

// Header Scroll Effect
const siteHeader = document.querySelector('#siteHeader');
window.addEventListener('scroll', () => {
  if (!siteHeader) return;
  siteHeader.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// Menu Mobile
const menuToggle = document.querySelector('#menuToggle');
const mainNav = document.querySelector('#mainNav');
const form = document.querySelector('#contactForm');
const formNote = document.querySelector('#formNote');

menuToggle?.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
});

mainNav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

// Ano atual no rodapé
const yearEl = document.querySelector('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// Máscara automática para telefone brasileiro (DDD + Número)
const phoneInput = document.querySelector('#phone');
phoneInput?.addEventListener('input', (e) => {
  let digits = e.target.value.replace(/\D/g, '').slice(0, 11);
  if (digits.length > 6) {
    if (digits.length === 11) {
      e.target.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else {
      e.target.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
  } else if (digits.length > 2) {
    e.target.value = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  } else if (digits.length > 0) {
    e.target.value = `(${digits}`;
  }
});

// Clique nos cards de serviço pré-seleciona a opção no formulário
const serviceSelect = document.querySelector('#service');
const nameInput = document.querySelector('#name');
document.querySelectorAll('.service-select-trigger').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    const targetService = trigger.getAttribute('data-service');
    if (serviceSelect && targetService) {
      serviceSelect.value = targetService;
    }
    setTimeout(() => nameInput?.focus(), 450);
  });
});

// Envio do Formulário de Pré-Orçamento
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;

  const button = form.querySelector('button[type="submit"]');
  const originalText = button.innerHTML;
  button.disabled = true;
  button.textContent = 'Preparando mensagem...';
  formNote.textContent = '';
  formNote.classList.remove('error-message');

  const payload = Object.fromEntries(new FormData(form).entries());

  try {
    const response = await fetch('/api/orcamento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível preparar a mensagem.');
    window.location.href = result.whatsappUrl;
  } catch (error) {
    formNote.textContent = `${error.message} Você também pode chamar diretamente pelo botão de WhatsApp ou Instagram.`;
    formNote.classList.add('error-message');
  } finally {
    button.disabled = false;
    button.innerHTML = originalText;
  }
});

// Animação Reveal no Scroll
const revealElements = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealElements.forEach((el) => observer.observe(el));
} else {
  revealElements.forEach((el) => el.classList.add('visible'));
}
