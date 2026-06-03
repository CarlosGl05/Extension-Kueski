document.addEventListener('DOMContentLoaded', () => {
  
  let currentKueskiId = '';

  function navigateTo(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
  }

  // --- NAVEGACIÓN PRINCIPAL Y LOGIN ---
  const inputUsuario = document.querySelector('#screen-login input[type="text"]');
  const inputPassword = document.querySelector('#screen-login input[type="password"]');
  const btnLogin = document.getElementById('btn-login');

  btnLogin.addEventListener('click', async () => {
    const correo = inputUsuario.value.trim();
    const contrasena = inputPassword.value.trim();

    if (!correo || !contrasena) {
      alert("Por favor, ingresa tu correo y contraseña.");
      return; 
    }

    const textoOriginal = btnLogin.innerHTML;
    btnLogin.innerHTML = '⏳ Validando...';
    btnLogin.disabled = true;

    try {
      const respuesta = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: correo, contrasena: contrasena })
      });

      const datos = await respuesta.json();

      if (respuesta.ok && datos.success) {
        const nombreUsuario = datos.usuario.nombre;
        currentKueskiId = datos.usuario.id_Kueski;

        document.querySelectorAll('.user-name').forEach(elemento => {
          elemento.textContent = nombreUsuario;
        });

        navigateTo('screen-main');
        inputUsuario.value = '';
        inputPassword.value = '';
      } else {
        alert(datos.error || "Credenciales incorrectas. Intenta de nuevo.");
      }

    } catch (error) {
      console.error("Error en la petición de login:", error);
      alert("No se pudo conectar con el servidor. Verifica que el backend esté corriendo.");
    } finally {
      btnLogin.innerHTML = textoOriginal;
      btnLogin.disabled = false;
    }
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    currentKueskiId = ''; 
    navigateTo('screen-login');
  });


  // --- LÓGICA DE SIMULADOR DE PAGOS (ACTUALIZADA CON SELECT) ---
  
  // Variables globales para guardar los datos de simulación
  let planesDisponibles = [];
  let precioArticuloOriginal = 0;
  let nombreArticulo = '';

  async function cargarSimulacion() {
    const container = document.getElementById('payment-details-container');
    container.innerHTML = '<p style="margin-left: 25px;">⏳ Calculando plan de pagos...</p>';

    const idCuenta = currentKueskiId || 'K003';
    
    try {
      const respuesta = await fetch('http://localhost:3000/api/simular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_Kueski: idCuenta, articulo: 'ps5' })
      });
      const datos = await respuesta.json();

      if (datos.success) {
        planesDisponibles = datos.opciones;
        precioArticuloOriginal = datos.precioOriginal;
        nombreArticulo = datos.articulo.toUpperCase();

        let html = `
          <div style="margin-bottom: 15px; margin-left: 25px;">
            <p style="margin-left: 0; margin-bottom: 5px; color: #333;">Plan para <strong>${nombreArticulo}</strong> ($${precioArticuloOriginal.toLocaleString('es-MX')} MXN):</p>
            
            <select id="select-plan" class="dropdown" style="margin-bottom: 10px; width: 100%; margin-left: 0;">
        `;
        
        planesDisponibles.forEach((plan, index) => {
           const selected = plan.quincenas === 12 ? 'selected' : '';
           html += `<option value="${index}" ${selected}>${plan.etiqueta}</option>`;
        });

        html += `
            </select>
            
            <div id="simulacion-montos">
              </div>
          </div>
          <button class="btn-primary">✓ Confirmar y Pagar con Kueski Pay</button>
        `;
        
        container.innerHTML = html;
        actualizarMontosSimulacion();
        document.getElementById('select-plan').addEventListener('change', actualizarMontosSimulacion);

      } else {
        container.innerHTML = `
          <div class="alert-box" style="background-color: #ffebee; border-color: #ffcdd2; color: #c62828; margin-left: 25px; margin-right: 15px; text-align: left;">
            <strong>Saldo insuficiente.</strong> ${datos.mensaje}
          </div>
          <button class="btn-gray" disabled style="cursor: not-allowed; opacity: 0.6;">✓ Confirmar y Pagar con Kueski Pay</button>
        `;
      }
    } catch (error) {
      container.innerHTML = `<p style="color: red; margin-left: 25px;">Error cargando simulación.</p>`;
    }
  }

  function actualizarMontosSimulacion() {
    const select = document.getElementById('select-plan');
    const index = select.value;
    const plan = planesDisponibles[index];
    const divMontos = document.getElementById('simulacion-montos');

    if (plan.quincenas === 0) {
      divMontos.innerHTML = `
        <h3 class="text-blue" style="margin-bottom: 2px;">1 pago único de $${plan.pagoQuincenal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
        <p class="text-xsmall" style="margin-left: 0;">Total a pagar: $${plan.totalAPagar.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Sin intereses)</p>
      `;
    } else {
      divMontos.innerHTML = `
        <h3 class="text-blue" style="margin-bottom: 2px;">${plan.quincenas} quincenas de $${plan.pagoQuincenal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
        <p class="text-xsmall" style="margin-left: 0;">Total a pagar: $${plan.totalAPagar.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Tasa 2% quincenal)</p>
      `;
    }
  }

  document.getElementById('nav-payment').addEventListener('click', async () => {
    navigateTo('screen-payment');
    await cargarSimulacion(); 
  });


  // --- NAVEGACIÓN SECUNDARIA ---
  document.getElementById('nav-credit').addEventListener('click', () => {
    navigateTo('screen-credit');
    document.getElementById('credit-hidden').style.display = 'block';
    document.getElementById('credit-shown').style.display = 'none';
  });

  document.getElementById('nav-rewards').addEventListener('click', () => {
    navigateTo('screen-rewards');
  });

  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateTo('screen-main');
    });
  });


  // --- LÓGICA DE LÍNEA DE CRÉDITO ---
  const btnShowCredit = document.getElementById('btn-show-credit');
  const btnHideCredit = document.getElementById('btn-hide-credit');
  const creditHiddenDiv = document.getElementById('credit-hidden');
  const creditShownDiv = document.getElementById('credit-shown');

  btnShowCredit.addEventListener('click', async () => {
    const textoOriginal = btnShowCredit.innerHTML;
    btnShowCredit.innerHTML = '⏳ Cargando datos...';
    btnShowCredit.disabled = true;

    const idCuenta = currentKueskiId || 'K003';

    try {
      const respuesta = await fetch(`http://localhost:3000/api/credito/${idCuenta}`);
      const datos = await respuesta.json();

      if (!respuesta.ok) throw new Error(datos.error || "Error en el servidor");

      const montos = creditShownDiv.querySelectorAll('.amount');
      montos[0].textContent = `$${datos.creditoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;
      montos[1].textContent = `$${datos.saldoDisponible.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN`;
      
      const alerta = creditShownDiv.querySelector('.alert-box strong');
      alerta.textContent = `Recuerda pagar antes del ${datos.fechaCorte}`;

      creditHiddenDiv.style.display = 'none';
      creditShownDiv.style.display = 'block';

    } catch (error) {
      console.error("Error conectando al backend:", error);
      alert(error.message || "No se pudo conectar con el servidor Express.");
    } finally {
      btnShowCredit.innerHTML = textoOriginal;
      btnShowCredit.disabled = false;
    }
  });

  btnHideCredit.addEventListener('click', () => {
    creditShownDiv.style.display = 'none';
    creditHiddenDiv.style.display = 'block';
  });


  // --- LÓGICA DE CUPONES Y RECOMPENSAS ---
  const inputCoupon = document.getElementById('input-coupon');
  const btnActivateCoupon = document.getElementById('btn-activate-coupon');
  const alertCoupon = document.getElementById('alert-coupon');
  const displayCouponCode = document.getElementById('display-coupon-code');
  const btnActivateCashback = document.getElementById('btn-activate-cashback');
  const alertCashback = document.getElementById('alert-cashback');
  const cardActiveBenefits = document.getElementById('card-active-benefits');
  const benefitsListContainer = document.getElementById('benefits-list-container');

  let isCouponActive = false;
  let isCashbackActive = false;
  let activeCouponCode = '';

  function updateBenefitsCard() {
    benefitsListContainer.innerHTML = ''; 
    if (isCouponActive || isCashbackActive) cardActiveBenefits.style.display = 'block'; 

    if (isCouponActive) {
      const li = document.createElement('li');
      li.textContent = `Cupón: ${activeCouponCode}`;
      benefitsListContainer.appendChild(li);
    }

    if (isCashbackActive) {
      const li = document.createElement('li');
      li.textContent = 'Cashback Amazon: 1%';
      benefitsListContainer.appendChild(li);
    }
  }

  btnActivateCoupon.addEventListener('click', async () => {
    const code = inputCoupon.value.trim();
    if (code === '') { alert("Por favor, ingresa un código."); return; }

    const textoOriginal = btnActivateCoupon.innerHTML;
    btnActivateCoupon.innerHTML = '⏳ Validando...';
    btnActivateCoupon.disabled = true;

    try {
      const respuesta = await fetch('http://localhost:3000/api/cupones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: code })
      });

      const datos = await respuesta.json();

      if (respuesta.ok && datos.success) {
        isCouponActive = true;
        activeCouponCode = `${code.toUpperCase()} (-$${datos.descuento} MXN)`;
        displayCouponCode.textContent = activeCouponCode;
        alertCoupon.classList.add('show');
        inputCoupon.disabled = true;
        btnActivateCoupon.style.display = 'none';
        updateBenefitsCard();
      } else {
        alert(datos.error || "Hubo un problema al registrar el cupón.");
      }
    } catch (error) {
      console.error("Error conectando al backend:", error);
      alert("No se pudo conectar con el servidor Express.");
    } finally {
      btnActivateCoupon.innerHTML = textoOriginal;
      btnActivateCoupon.disabled = false;
    }
  });

  btnActivateCashback.addEventListener('click', () => {
    isCashbackActive = true;
    btnActivateCashback.textContent = '✓ Cashback Activado';
    btnActivateCashback.style.backgroundColor = '#1a56ff';
    btnActivateCashback.style.border = '2px solid white';
    btnActivateCashback.style.outline = '2px solid #1a56ff';
    alertCashback.classList.add('show');
    updateBenefitsCard();
  });

});