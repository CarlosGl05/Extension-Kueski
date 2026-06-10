(function() {
  if (document.getElementById('kueski-fab')) return;

  function getAmazonPrice() {
    const selectors = [
      '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen', 
      '#corePrice_desktop .a-price .a-offscreen', 
      '#priceblock_ourprice', 
      '.a-price.a-text-price.a-size-medium .a-offscreen'
    ];
    for (let selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent) {
        const rawString = el.textContent.replace(/[^0-9.]/g, '');
        const price = parseFloat(rawString);
        if (price > 0) return price;
      }
    }
    const wholeEl = document.querySelector('#corePriceDisplay_desktop_feature_div .a-price-whole');
    const fractionEl = document.querySelector('#corePriceDisplay_desktop_feature_div .a-price-fraction');
    if (wholeEl) {
      let wholeText = wholeEl.textContent.replace(/[^0-9]/g, '');
      let fractionText = fractionEl ? fractionEl.textContent.replace(/[^0-9]/g, '') : '00';
      const price = parseFloat(`${wholeText}.${fractionText}`);
      if (price > 0) return price;
    }
    return null;
  }

  function calcQuincena(precio) {
    return precio * (0.02 * Math.pow(1.02, 15)) / (Math.pow(1.02, 15) - 1);
  }

  function injectKueski() {
    const precioArticulo = getAmazonPrice();
    const logoUrl = chrome.runtime.getURL("logo.png");

    if (precioArticulo) {
      chrome.storage.local.set({ amazonPrice: precioArticulo });
    } else {
      chrome.storage.local.remove(['amazonPrice']); 
    }

    // 1. Inyectar el botón fijo (FAB)
    const fab = document.createElement('div');
    fab.id = 'kueski-fab';
    fab.title = 'Abrir Kueski Pay';
    fab.innerHTML = `<img src="${logoUrl}" alt="Kueski">`;
    document.body.appendChild(fab);

    // 2. Definir el mensaje del Toast dependiendo de si hay precio o no
    const widget = document.createElement('div');
    widget.id = 'kueski-floating-widget';

    if (precioArticulo) {
      const pagoFormateated = calcQuincena(precioArticulo).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
      widget.innerHTML = `
        <div class="kueski-minimal-content">
          <img src="${logoUrl}" alt="Kueski" class="kueski-minimal-logo">
          <div class="kueski-minimal-text">
            <span class="kueski-fw-title">Kueski Pay</span>
            <span class="kueski-fw-desc">Llévatelo desde <strong>${pagoFormateated}</strong> quincenales</span>
            <span style="font-size: 11.5px; color: #15803d; font-weight: 700; margin-top: 3px; display: flex; align-items: center; gap: 4px;">
              🎉 ¡Obtén 1% de cashback en esta tienda!
            </span>
          </div>
        </div>
        <button class="kueski-minimal-close" id="kueski-fw-close-btn">&times;</button>
      `;
    } else {
      widget.innerHTML = `
        <div class="kueski-minimal-content">
          <img src="${logoUrl}" alt="Kueski" class="kueski-minimal-logo">
          <div class="kueski-minimal-text">
            <span class="kueski-fw-title">Beneficio Exclusivo</span>
            <span class="kueski-fw-desc">🎉 Tienes <strong>1% de cashback</strong> disponible.</span>
            <span style="font-size: 11.5px; color: #2563eb; font-weight: 700; margin-top: 3px;">
              Abre la extensión para activarlo
            </span>
          </div>
        </div>
        <button class="kueski-minimal-close" id="kueski-fw-close-btn">&times;</button>
      `;
    }

    document.body.appendChild(widget);

    // 3. Función para abrir la app
    const openExtension = () => {
      if (document.getElementById('kueski-app-container')) return;

      // ====== CAMBIO AQUÍ: OCULTAMOS EL BOTÓN FLOTANTE ======
      fab.style.display = 'none';

      const popupUrl = chrome.runtime.getURL("popup.html");
      
      const appContainer = document.createElement('div');
      appContainer.id = 'kueski-app-container';
      
      appContainer.style.cssText = `
        position: fixed;
        top: 24px; 
        right: 24px;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 10px;
        z-index: 2147483647;
        animation: kueskiAppIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      `;

      const style = document.createElement('style');
      style.textContent = `@keyframes kueskiAppIn { from { transform: translateY(-20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`;
      document.head.appendChild(style);

      const closeAppBtn = document.createElement('button');
      closeAppBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      closeAppBtn.style.cssText = `
        width: 36px; height: 36px; border-radius: 50%; background: #ffffff;
        border: 1px solid #e2e8f0; box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;
      `;
      closeAppBtn.onmouseover = () => { closeAppBtn.style.background = '#f1f5f9'; closeAppBtn.style.color = '#dc2626'; };
      closeAppBtn.onmouseout = () => { closeAppBtn.style.background = '#ffffff'; closeAppBtn.style.color = '#475569'; };
      
      // ====== CAMBIO AQUÍ: VOLVEMOS A MOSTRAR EL BOTÓN AL CERRAR ======
      closeAppBtn.onclick = () => {
        appContainer.remove();
        fab.style.display = 'flex'; // Reaparece el botón
      };

      const iframeWrapper = document.createElement('div');
      iframeWrapper.style.cssText = `
        width: 400px; height: 650px; background: #ffffff; border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05); overflow: hidden;
      `;

      const iframe = document.createElement('iframe');
      iframe.src = popupUrl;
      iframe.style.cssText = `width: 100%; height: 100%; border: none;`;

      iframeWrapper.appendChild(iframe);
      appContainer.appendChild(closeAppBtn);
      appContainer.appendChild(iframeWrapper);
      document.body.appendChild(appContainer);

      // Desaparece el Toast largo si estaba abierto
      if (document.getElementById('kueski-floating-widget')) {
        widget.style.animation = "kueskiToastOut 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards";
        setTimeout(() => widget.remove(), 400);
      }
    };

    fab.addEventListener('click', openExtension);
    
    widget.addEventListener('click', (e) => {
      if (e.target.closest('#kueski-fw-close-btn')) return;
      openExtension();
    });

    document.getElementById('kueski-fw-close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      widget.style.animation = "kueskiToastOut 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards";
      setTimeout(() => widget.remove(), 400);
    });

    setTimeout(() => {
      if(document.getElementById('kueski-floating-widget')) {
        widget.style.animation = "kueskiToastOut 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards";
        setTimeout(() => widget.remove(), 400);
      }
    }, 10000);
  }

  if (document.readyState === 'complete') {
    setTimeout(injectKueski, 500);
  } else {
    window.addEventListener('load', () => setTimeout(injectKueski, 500));
  }
})();