/**
 * TDS Theme — theme.js
 * Handles: variant selection (price + id update), thumbnail image swap,
 *          quick-view modal with AJAX add-to-cart.
 * No frameworks; vanilla JS only.
 */

(function () {
  'use strict';

  /* ── Variant selection ─────────────────────────────────── */

  /**
   * Given a product form element, wire up variant buttons or select
   * so clicking/changing them updates:
   *   - the hidden variant id input
   *   - the displayed price
   *   - aria-pressed state on buttons
   */
  function initVariantSelector(formEl) {
    var hiddenInput = formEl.querySelector('[name="id"]');
    var priceEl = document.querySelector('.product-price');
    if (!hiddenInput) return;

    /* Button-style selectors */
    var buttons = formEl.querySelectorAll('.variant-btn');
    if (buttons.length) {
      buttons.forEach(function (btn) {
        btn.addEventListener('click', function () {
          buttons.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
          btn.setAttribute('aria-pressed', 'true');
          hiddenInput.value = btn.dataset.variantId;
          if (priceEl && btn.dataset.price) {
            priceEl.textContent = btn.dataset.priceFormatted || btn.dataset.price;
          }
          // availability
          var submitBtn = formEl.querySelector('.product-form__submit');
          if (submitBtn) {
            var available = btn.dataset.available !== 'false';
            submitBtn.disabled = !available;
            submitBtn.textContent = available
              ? submitBtn.dataset.addText
              : submitBtn.dataset.soldText;
          }
        });
      });
    }

    /* Select-style selector */
    var select = formEl.querySelector('.variant-select');
    if (select) {
      select.addEventListener('change', function () {
        var chosen = select.options[select.selectedIndex];
        hiddenInput.value = chosen.value;
        if (priceEl && chosen.dataset.priceFormatted) {
          priceEl.textContent = chosen.dataset.priceFormatted;
        }
        var submitBtn = formEl.querySelector('.product-form__submit');
        if (submitBtn) {
          var available = chosen.dataset.available !== 'false';
          submitBtn.disabled = !available;
          submitBtn.textContent = available
            ? submitBtn.dataset.addText
            : submitBtn.dataset.soldText;
        }
      });
    }
  }

  /* ── Thumbnail image swap ─────────────────────────────── */

  function initThumbnails() {
    var mainImg = document.querySelector('.product-media__main img');
    if (!mainImg) return;

    var thumbs = document.querySelectorAll('.product-thumb');
    thumbs.forEach(function (thumb) {
      thumb.addEventListener('click', function () {
        var src = thumb.dataset.src;
        var srcset = thumb.dataset.srcset;
        if (src) mainImg.src = src;
        if (srcset) mainImg.srcset = srcset;
        var altText = thumb.dataset.alt || '';
        mainImg.alt = altText;

        thumbs.forEach(function (t) { t.setAttribute('aria-selected', 'false'); });
        thumb.setAttribute('aria-selected', 'true');
      });

      thumb.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          thumb.click();
        }
      });
    });
  }

  /* ── Quick-view modal ─────────────────────────────────── */

  var overlay = null;
  var modal = null;
  var contentEl = null;
  var closeBtn = null;
  var previouslyFocused = null;
  var productHandles = [];
  var currentProductIndex = 0;

  function formatMoney(cents) {
    var amount = (cents / 100).toFixed(2);
    return '$' + amount;
  }

  function openQuickView(productHandle, fallbackUrl) {
    overlay = document.getElementById('quickview-overlay');
    modal = document.getElementById('quickview-modal');
    contentEl = document.getElementById('quickview-content');
    closeBtn = document.getElementById('quickview-close');
    if (!overlay || !modal || !contentEl) return;

    previouslyFocused = document.activeElement;

    contentEl.innerHTML = '<div style="padding:var(--space-5);text-align:center;grid-column:1/-1">Loading&hellip;</div>';
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    closeBtn.focus();

    fetch('/products/' + productHandle + '.js')
      .then(function (res) {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then(function (product) {
        renderQuickView(product, fallbackUrl);
      })
      .catch(function () {
        contentEl.innerHTML =
          '<div style="padding:var(--space-5);grid-column:1/-1">Could not load product. ' +
          '<a href="' + fallbackUrl + '">View product page</a></div>';
      });
  }

  function closeQuickView() {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
    if (previouslyFocused && previouslyFocused.focus) {
      previouslyFocused.focus();
    }
  }

  function renderQuickView(product, fallbackUrl) {
    var firstVariant = product.variants[0];
    var imageHtml = '';
    if (product.images && product.images.length > 0) {
      imageHtml =
        '<div class="quickview-modal__image-wrap">' +
        '<img src="' + product.images[0] + '" alt="' + escapeHtml(product.title) + '">' +
        '</div>';
    }

    var variantsHtml = '';
    if (product.variants.length > 1) {
      variantsHtml = '<div class="quickview-modal__variants">' +
        '<label for="quickview-variant">Variant</label>' +
        '<select class="variant-select" id="quickview-variant">';
      product.variants.forEach(function (v) {
        var available = v.available ? '' : ' data-available="false"';
        variantsHtml +=
          '<option value="' + v.id + '"' +
          ' data-price-formatted="' + escapeHtml(formatMoney(v.price)) + '"' +
          available + '>' +
          escapeHtml(v.title) +
          (v.available ? '' : ' — Sold out') +
          '</option>';
      });
      variantsHtml += '</select></div>';
    }

    var addText = firstVariant.available ? 'Add to cart' : 'Sold out';
    var descHtml = product.description
      ? '<div class="quickview-modal__description">' + product.description + '</div>'
      : '';

    var html =
      imageHtml +
      '<div class="quickview-modal__info">' +
        '<h2 class="quickview-modal__title">' + escapeHtml(product.title) + '</h2>' +
        '<p class="quickview-modal__price" id="quickview-price">' + formatMoney(firstVariant.price) + '</p>' +
        variantsHtml +
        '<div class="quickview-modal__quantity">' +
          '<label for="quickview-qty">Qty</label>' +
          '<input type="number" id="quickview-qty" class="quantity-input" value="1" min="1" aria-label="Quantity">' +
        '</div>' +
        '<p class="quickview-modal__message" id="quickview-message" aria-live="polite"></p>' +
        '<button class="quickview-modal__atc" id="quickview-atc"' +
          ' data-add-text="Add to cart" data-sold-text="Sold out"' +
          (firstVariant.available ? '' : ' disabled') + '>' +
          addText +
        '</button>' +
        '<input type="hidden" id="quickview-variant-id" value="' + firstVariant.id + '">' +
        descHtml +
        '<a href="' + fallbackUrl + '" class="quickview-modal__view-full">View full product page</a>' +
      '</div>';

    contentEl.innerHTML = html;

    /* Render navigation if multiple products */
    if (productHandles.length > 1) {
      var total = productHandles.length;
      var dotsCount = Math.min(total, 3);
      var windowStart = Math.max(0, Math.min(currentProductIndex - 1, total - dotsCount));
      var dotsHtml = '';
      for (var i = windowStart; i < windowStart + dotsCount; i++) {
        dotsHtml += '<span class="quickview-dot' + (i === currentProductIndex ? ' quickview-dot--active' : '') + '"></span>';
      }
      var navHtml =
        '<div class="quickview-nav">' +
          '<button class="quickview-nav__btn" id="quickview-prev" aria-label="Previous product"' +
            (currentProductIndex === 0 ? ' disabled' : '') + '>&#8592;</button>' +
          '<div class="quickview-dots">' + dotsHtml + '</div>' +
          '<button class="quickview-nav__btn" id="quickview-next" aria-label="Next product"' +
            (currentProductIndex >= total - 1 ? ' disabled' : '') + '>&#8594;</button>' +
        '</div>';
      contentEl.insertAdjacentHTML('beforeend', navHtml);

      var prevBtn = contentEl.querySelector('#quickview-prev');
      var nextBtn = contentEl.querySelector('#quickview-next');
      if (prevBtn) {
        prevBtn.addEventListener('click', function () {
          currentProductIndex--;
          var p = productHandles[currentProductIndex];
          openQuickView(p.handle, p.url);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', function () {
          currentProductIndex++;
          var p = productHandles[currentProductIndex];
          openQuickView(p.handle, p.url);
        });
      }
    }

    /* Wire up variant select */
    var select = contentEl.querySelector('.variant-select');
    var variantIdInput = contentEl.querySelector('#quickview-variant-id');
    var priceEl = contentEl.querySelector('#quickview-price');
    var atcBtn = contentEl.querySelector('#quickview-atc');

    if (select) {
      select.addEventListener('change', function () {
        var chosen = select.options[select.selectedIndex];
        if (variantIdInput) variantIdInput.value = chosen.value;
        if (priceEl && chosen.dataset.priceFormatted) {
          priceEl.textContent = chosen.dataset.priceFormatted;
        }
        if (atcBtn) {
          var available = chosen.dataset.available !== 'false';
          atcBtn.disabled = !available;
          atcBtn.textContent = available ? atcBtn.dataset.addText : atcBtn.dataset.soldText;
        }
      });
    }

    /* Wire up add-to-cart */
    if (atcBtn) {
      atcBtn.addEventListener('click', function () {
        var variantId = variantIdInput ? variantIdInput.value : firstVariant.id;
        var qty = contentEl.querySelector('#quickview-qty');
        var quantity = qty ? parseInt(qty.value, 10) || 1 : 1;
        var msgEl = contentEl.querySelector('#quickview-message');

        atcBtn.disabled = true;
        atcBtn.textContent = 'Adding\u2026';

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: variantId, quantity: quantity })
        })
          .then(function (res) {
            if (!res.ok) return res.json().then(function (d) { throw new Error(d.description || 'Error'); });
            return res.json();
          })
          .then(function () {
            if (msgEl) msgEl.textContent = 'Added to cart!';
            atcBtn.disabled = false;
            atcBtn.textContent = atcBtn.dataset.addText;
            /* Update cart count in header if present */
            return fetch('/cart.js');
          })
          .then(function (res) { return res && res.json ? res.json() : null; })
          .then(function (cartData) {
            if (!cartData) return;
            var cartLink = document.querySelector('.site-header__cart');
            if (cartLink) {
              var count = cartData.item_count;
              cartLink.textContent = count > 0 ? 'Cart (' + count + ')' : 'Cart';
              cartLink.setAttribute('aria-label', 'Cart (' + count + ' items)');
            }
          })
          .catch(function (err) {
            if (msgEl) msgEl.textContent = err.message || 'Could not add to cart.';
            atcBtn.disabled = false;
            atcBtn.textContent = atcBtn.dataset.addText;
          });
      });
    }

    /* Focus close button */
    closeBtn.focus();
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function trapFocus(e) {
    if (!modal || modal.parentElement.hidden) return;
    var focusable = modal.querySelectorAll(
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function initQuickView() {
    overlay = document.getElementById('quickview-overlay');
    if (!overlay) return;

    closeBtn = document.getElementById('quickview-close');
    modal = document.getElementById('quickview-modal');

    /* Close on button click */
    if (closeBtn) {
      closeBtn.addEventListener('click', closeQuickView);
    }

    /* Close on overlay backdrop click */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeQuickView();
    });

    /* Close on Escape key */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) closeQuickView();
      if (e.key === 'Tab' && !overlay.hidden) trapFocus(e);
    });

    /* Wire up product card links */
    document.querySelectorAll('[data-quickview]').forEach(function (link) {
      var handle = link.dataset.productHandle;
      if (handle) {
        var existing = productHandles.some(function (p) { return p.handle === handle; });
        if (!existing) {
          productHandles.push({ handle: handle, url: link.href });
        }
      }
      link.addEventListener('click', function (e) {
        if (!handle) return; /* fall through to normal navigation */
        e.preventDefault();
        currentProductIndex = productHandles.findIndex(function (p) { return p.handle === handle; });
        if (currentProductIndex < 0) currentProductIndex = 0;
        openQuickView(handle, link.href);
      });
    });
  }

  /* ── Init ─────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    var productForm = document.querySelector('.product-form');
    if (productForm) initVariantSelector(productForm);
    initThumbnails();
    initQuickView();
  });
})();

