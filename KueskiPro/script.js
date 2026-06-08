document.addEventListener('DOMContentLoaded', () => {

  let currentKueskiId = '';
  let creditoDisponibleSimulacion = 0;

  function navigateTo(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  // ==================== LÓGICA DE PESTAÑAS (TABS) ====================
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      tabContents.forEach(content => {
        content.classList.remove('active');
        if (content.id === targetTab) {
          content.classList.add('active');
        }
      });
    });
  });

  // ==================== LOGIN Y REGISTRO ====================
  const inputUsuario  = document.querySelector('#screen-login input[type="text"]');
  const inputPassword = document.querySelector('#screen-login input[type="password"]');
  const btnLogin      = document.getElementById('btn-login');

  document.getElementById('btn-register').addEventListener('click', () => {
    window.open('https://accounts.kueski.com/u/signup?state=hKFo2SBoUkVmRW1EV25jdlpMNjZiVnFEVG1zYmFRMW1mWEF0Q6Fur3VuaXZlcnNhbC1sb2dpbqN0aWTZIHpfemZtUTFHQTFjVURBYTNNRlFRd2trLXZtbnZhU0Vxo2NpZNkgbkpiYnpvSmtqRDBsSThRRFhyMzZtYUJUT0lpNmVRek0', '_blank');
  });

  btnLogin.addEventListener('click', async () => {
    const correo    = inputUsuario.value.trim();
    const contrasena = inputPassword.value.trim();
    if (!correo || !contrasena) { alert('Por favor, ingresa tu correo y contraseña.'); return; }

    const orig = btnLogin.textContent;
    btnLogin.textContent = '⏳ Validando...';
    btnLogin.disabled = true;

    try {
      const r    = await fetch('http://localhost:3000/api/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ correo, contrasena }) });
      const data = await r.json();

      if (r.ok && data.success) {
        const nombre  = data.usuario.nombre;
        const moroso  = parseFloat(data.usuario.moroso || 0);
        currentKueskiId = data.usuario.id_Kueski;

        const initials = nombre.trim().split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

        document.querySelectorAll('.user-name').forEach(el => el.textContent = nombre);
        const heroName = document.getElementById('hero-user-name');
        if (heroName) heroName.textContent = nombre;

        document.getElementById('profile-avatar-initials').textContent = initials;
        document.querySelector('.profile-name').textContent = nombre;
        document.getElementById('profile-kueski-id').textContent = `ID: ${currentKueskiId}`;
        
        const morosoEl = document.getElementById('profile-moroso');
        morosoEl.textContent = `$${moroso.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
        morosoEl.className = moroso > 0 ? 'pstat-val red' : 'pstat-val';

        if (moroso > 0) {
          document.getElementById('profile-al-corriente').style.display = 'none';
          document.getElementById('profile-con-adeudo').style.display = 'flex';
        } else {
          document.getElementById('profile-al-corriente').style.display = 'flex';
          document.getElementById('profile-con-adeudo').style.display = 'none';
        }

        resetDashboard(false); 
        cargarMisCupones(); 
        
        // CAMBIO IMPLEMENTADO: Carga el crédito y la fecha de corte en el login
        await cargarCredito(); 
        
        navigateTo('screen-dashboard');
        
        tabButtons[0].click();
        
        inputUsuario.value = '';
        inputPassword.value = '';
      } else {
        alert(data.error || 'Credenciales incorrectas.');
      }
    } catch(e) {
      console.error(e);
      alert('No se pudo conectar con el servidor.');
    } finally {
      btnLogin.textContent = orig;
      btnLogin.disabled = false;
    }
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    currentKueskiId = '';
    resetDashboard(true);
    navigateTo('screen-login');
  });

  // ==================== PAYMENT / SIMULACIÓN ====================
  document.getElementById('nav-payment').addEventListener('click', async () => {
    navigateTo('screen-payment');
    await cargarSimulacion();
  });

  document.querySelectorAll('.btn-back-clean').forEach(btn => btn.addEventListener('click', () => navigateTo('screen-dashboard')));

  let planesDisponibles = [];

  async function cargarSimulacion() {
    const c = document.getElementById('payment-details-container');
    c.innerHTML = '<p style="margin-left:25px">⏳ Calculando plan de pagos...</p>';
    const id = currentKueskiId || 'K003';
    
    chrome.storage.local.get(['amazonPrice'], async (result) => {
      const precioAmazon = result.amazonPrice || null;

      try {
        const r    = await fetch('http://localhost:3000/api/simular', { 
          method:'POST', 
          headers:{'Content-Type':'application/json'}, 
          body: JSON.stringify({ id_Kueski: id, articulo:'ps5', precio_directo: precioAmazon }) 
        });
        const data = await r.json();
        
        if (data.success) {
          planesDisponibles = data.opciones;
          creditoDisponibleSimulacion = data.creditoDisponible; 
          
          let html = `<div style="margin-bottom:15px;margin-left:25px">
            <p style="margin-left:0;margin-bottom:12px;color:var(--text);font-size:14px;">Plan para <strong>${data.articulo}</strong> ($${data.precioOriginal.toLocaleString('es-MX')} MXN):</p>
            <div class="plan-grid" id="plan-grid">`;
          
          data.opciones.forEach((p, i) => { 
            const isActive = p.quincenas === 12 ? 'active' : '';
            html += `<div class="plan-btn ${isActive}" data-index="${i}">${p.etiqueta}</div>`; 
          });
          
          html += `</div><div id="simulacion-montos"></div></div><button class="btn-primary-pay">✓ Confirmar y Pagar con Kueski Pay</button>`;
          c.innerHTML = html;
          
          actualizarMontosSimulacion();
          
          document.querySelectorAll('.plan-btn').forEach(btn => {
            btn.addEventListener('click', function() {
              document.querySelectorAll('.plan-btn').forEach(b => b.classList.remove('active'));
              this.classList.add('active');
              actualizarMontosSimulacion();
            });
          });

          document.querySelector('.btn-primary-pay').addEventListener('click', () => {
            window.open('https://kueski.com', '_blank');
          });

        } else {
          c.innerHTML = `<div style="background:#ffebee;border:1px solid #ffcdd2;color:#c62828;border-radius:8px;padding:12px;margin:0 15px 0 25px;font-size:13px"><strong>Error.</strong> ${data.mensaje || 'No se pudo cargar la simulación.'}</div><button class="btn-primary-pay" disabled style="opacity:.5;cursor:not-allowed;margin-top:10px">✓ Confirmar y Pagar con Kueski Pay</button>`;
        }
      } catch(e) { 
        c.innerHTML = '<p style="color:red;margin-left:25px">Error cargando simulación.</p>'; 
      }
    });
  }

  function actualizarMontosSimulacion() {
    const activeBtn = document.querySelector('.plan-btn.active');
    if (!activeBtn) return;
    
    const index = activeBtn.getAttribute('data-index');
    const plan = planesDisponibles[index];
    const div  = document.getElementById('simulacion-montos');
    const btnPay = document.querySelector('.btn-primary-pay');
    if (!plan) return;

    let htmlMontos = plan.quincenas === 0
      ? `<h3 style="color:var(--blue);margin-bottom:2px">1 pago de $${plan.pagoQuincenal.toLocaleString('es-MX',{minimumFractionDigits:2, maximumFractionDigits:2})}</h3><p style="font-size:12px;color:var(--sub);margin:0">Total: $${plan.totalAPagar.toLocaleString('es-MX',{minimumFractionDigits:2, maximumFractionDigits:2})} (Sin intereses)</p>`
      : `<h3 style="color:var(--blue);margin-bottom:2px">${plan.quincenas} quincenas de $${plan.pagoQuincenal.toLocaleString('es-MX',{minimumFractionDigits:2, maximumFractionDigits:2})}</h3><p style="font-size:12px;color:var(--sub);margin:0">Total: $${plan.totalAPagar.toLocaleString('es-MX',{minimumFractionDigits:2, maximumFractionDigits:2})} (Tasa 2% quincenal)</p>`;

    if (plan.totalAPagar > creditoDisponibleSimulacion) {
        htmlMontos += `<div style="background:#ffebee;border:1px solid #ffcdd2;color:#c62828;border-radius:8px;padding:10px;margin-top:12px;font-size:12px">
            <strong>Crédito insuficiente.</strong> Tu saldo ($${creditoDisponibleSimulacion.toLocaleString('es-MX',{minimumFractionDigits:2, maximumFractionDigits:2})}) no cubre el total de este plan.
        </div>`;
        btnPay.disabled = true; 
    } else {
        btnPay.disabled = false; 
    }

    div.innerHTML = htmlMontos;
  }

  // ==================== CRÉDITO ====================
  const btnToggle  = document.getElementById('btn-toggle-credit');
  const btnShow    = document.getElementById('btn-show-credit');
  const hiddenDiv  = document.getElementById('credit-hidden-state');
  const shownDiv   = document.getElementById('credit-shown-state');
  const eyeOpen    = document.getElementById('icon-eye-open');
  const eyeClosed  = document.getElementById('icon-eye-closed');
  let creditLoaded = false;

  btnToggle.addEventListener('click', () => {
    if (shownDiv.style.display === 'none') {
      if (!creditLoaded) { cargarCredito(); }
      else { hiddenDiv.style.display='none'; shownDiv.style.display='block'; eyeOpen.style.display='none'; eyeClosed.style.display=''; }
    } else {
      shownDiv.style.display='none'; hiddenDiv.style.display='block'; eyeOpen.style.display=''; eyeClosed.style.display='none';
    }
  });

  btnShow.addEventListener('click', cargarCredito);

  async function cargarCredito() {
    const orig = btnShow.textContent;
    if(btnShow) btnShow.textContent = '⏳ Cargando...';
    
    const id = currentKueskiId || 'K003';
    try {
      const r    = await fetch(`http://localhost:3000/api/credito/${id}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Error en servidor');

      document.getElementById('credit-total').textContent     = `$${data.creditoTotal.toLocaleString('es-MX',{minimumFractionDigits:2})}`;
      document.getElementById('credit-available').textContent = `$${data.saldoDisponible.toLocaleString('es-MX',{minimumFractionDigits:2})}`;
      document.getElementById('credit-progress').style.width  = Math.min(100,(data.saldoDisponible/data.creditoTotal)*100).toFixed(1)+'%';
      
      // Actualización del mensaje dinámico solicitado
      document.getElementById('texto-corte').textContent = `Próximo pago ${data.fechaCorte}`;
      document.getElementById('profile-fecha-corte').textContent = data.fechaCorte;

      creditLoaded = true;
      if(hiddenDiv && shownDiv) {
        hiddenDiv.style.display = 'none';
        shownDiv.style.display  = 'block';
        eyeOpen.style.display   = 'none';
        eyeClosed.style.display = '';
      }
    } catch(e) {
      console.error(e);
    } finally {
      if(btnShow) {
        btnShow.textContent = orig;
        btnShow.disabled = false;
      }
    }
  }

  // ==================== CASHBACK Y CUPONES ====================
  const btnCashback   = document.getElementById('btn-activate-cashback');
  const cashbackMsg   = document.getElementById('cashback-active-msg');
  let isCashbackActive = false;

  btnCashback.addEventListener('click', () => {
    isCashbackActive = true;
    btnCashback.textContent = '✓ Activo';
    btnCashback.disabled = true;
    cashbackMsg.style.display = 'flex';
    updateBenefits();
  });

  const inputCoupon  = document.getElementById('input-coupon');
  const btnAddCoupon = document.getElementById('btn-add-coupon');
  const alertCoupon  = document.getElementById('alert-coupon');
  const displayCode  = document.getElementById('display-coupon-code');
  const btnRemoveCoupon = document.getElementById('btn-remove-active-coupon');
  const listContainer = document.getElementById('user-coupons-list');
  
  let isCouponActive   = false;
  let activeCouponCode = '';

  async function cargarMisCupones() {
    if (!currentKueskiId) return;
    try {
      const r = await fetch(`http://localhost:3000/api/cupones/${currentKueskiId}`);
      const data = await r.json();
      
      listContainer.innerHTML = '';
      
      if (data.success && data.cupones.length > 0) {
        data.cupones.forEach(c => {
          const item = document.createElement('div');
          item.className = 'coupon-item';
          item.innerHTML = `
            <div class="coupon-item-info">
              <span class="coupon-item-code">${c.codigo}</span>
              <span class="coupon-item-desc">Descuento: $${c.descuento}</span>
            </div>
            <button class="btn-use-coupon" data-code="${c.codigo}" data-desc="${c.descuento}">Aplicar</button>
          `;
          listContainer.appendChild(item);
        });

        document.querySelectorAll('.btn-use-coupon').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const code = e.target.getAttribute('data-code');
            const desc = e.target.getAttribute('data-desc');
            activarCuponVista(code, desc);
          });
        });

      } else {
        listContainer.innerHTML = '<p style="font-size: 12px; color: var(--sub); text-align: center; margin: 10px 0;">No tienes cupones guardados.</p>';
      }
    } catch(e) {
      listContainer.innerHTML = '<p style="font-size: 12px; color: red; text-align: center;">Error cargando cupones.</p>';
    }
  }

  function activarCuponVista(codigo, descuento) {
    isCouponActive = true;
    activeCouponCode = `${codigo.toUpperCase()} -$${descuento}`;
    displayCode.textContent = activeCouponCode;
    alertCoupon.style.display = 'flex';
    updateBenefits();
  }

  btnRemoveCoupon.addEventListener('click', () => {
    isCouponActive = false;
    activeCouponCode = '';
    alertCoupon.style.display = 'none';
    updateBenefits();
  });

  btnAddCoupon.addEventListener('click', async () => {
    const code = inputCoupon.value.trim();
    if (!code) { alert('Ingresa un código.'); return; }
    if (!currentKueskiId) { alert('Sesión no válida.'); return; }

    const orig = btnAddCoupon.textContent;
    btnAddCoupon.textContent = '⏳';
    btnAddCoupon.disabled = true;
    
    try {
      const r = await fetch('http://localhost:3000/api/cupones', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ codigo: code, id_Kueski: currentKueskiId }) 
      });
      const data = await r.json();
      
      if (r.ok && data.success) {
        inputCoupon.value = '';
        await cargarMisCupones(); 
        activarCuponVista(code, data.descuento); 
      } else {
        alert(data.error || 'No se pudo agregar el cupón.');
      }
    } catch(e) {
      alert('Error de conexión.');
    } finally {
      btnAddCoupon.textContent = orig;
      btnAddCoupon.disabled = false;
    }
  });

  function updateBenefits() {
    const section = document.getElementById('benefits-section');
    const list    = document.getElementById('benefits-list-container');
    list.innerHTML = '';
    if (isCouponActive) {
      const li = document.createElement('li'); li.textContent = `Cupón: ${activeCouponCode}`; list.appendChild(li);
    }
    if (isCashbackActive) {
      const li = document.createElement('li'); li.textContent = 'Cashback Amazon: 1%'; list.appendChild(li);
    }
    section.style.display = (isCouponActive || isCashbackActive) ? 'block' : 'none';
  }

  // ==================== RESET ====================
  function resetDashboard(full) {
    creditLoaded = false;
    hiddenDiv.style.display = 'block';
    shownDiv.style.display  = 'none';
    eyeOpen.style.display   = '';
    eyeClosed.style.display = 'none';

    isCouponActive = false; isCashbackActive = false; activeCouponCode = '';
    inputCoupon.value = ''; inputCoupon.disabled = false;
    alertCoupon.style.display = 'none';
    document.getElementById('benefits-section').style.display = 'none';
    cashbackMsg.style.display = 'none';
    btnCashback.textContent = 'Activar'; btnCashback.disabled = false;

    if (full) {
      document.querySelector('.profile-name').textContent = '';
      document.getElementById('profile-kueski-id').textContent = 'ID Kueski';
      document.getElementById('profile-moroso').textContent = '$0.00';
      document.getElementById('profile-moroso').className = 'pstat-val';
      document.getElementById('profile-fecha-corte').textContent = '—';
      document.getElementById('profile-al-corriente').style.display = 'none';
      document.getElementById('profile-con-adeudo').style.display = 'none';
      listContainer.innerHTML = '<p style="font-size: 12px; color: var(--sub); text-align: center; margin: 10px 0;">Cargando cupones...</p>';
    }
  }

});