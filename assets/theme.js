/**
 * TDS Theme — theme.js
 * Handles: variant selection (price + id update), thumbnail image swap.
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

  /* ── Init ─────────────────────────────────────────────── */

  document.addEventListener('DOMContentLoaded', function () {
    var productForm = document.querySelector('.product-form');
    if (productForm) initVariantSelector(productForm);
    initThumbnails();
  });
})();
