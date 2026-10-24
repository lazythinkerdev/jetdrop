"use strict";
/**
 * Custom shadcn/ui-style confirmation, prompt & alert dialogs.
 * Replaces native window.confirm / window.prompt / window.alert.
 * Async/Promise-based so callers await instead of blocking.
 */

const $c = id => document.getElementById(id);

let CD = null, PD = null;
let activeResolver = null;
let activeDialog = null;

function initDialogs() {
  CD = {
    dialog: $c("confirmDialog"),
    title: $c("confirmTitle"),
    msg: $c("confirmMessage"),
    ok: $c("confirmOk"),
    cancel: $c("confirmCancel")
  };
  PD = {
    dialog: $c("promptDialog"),
    title: $c("promptTitle"),
    msg: $c("promptMessage"),
    input: $c("promptInput"),
    ok: $c("promptOk"),
    cancel: $c("promptCancel")
  };
}

function resolveTitle(titleKeyOrText, defaultKey) {
  if (titleKeyOrText) {
    if (typeof t === "function") {
      const translated = t(titleKeyOrText);
      if (translated && translated !== titleKeyOrText) return translated;
    }
    return titleKeyOrText;
  }
  return (typeof t === "function") ? t(defaultKey) : defaultKey;
}

function closeDialog(result) {
  if (activeDialog) {
    activeDialog.style.display = "none";
    activeDialog = null;
  }
  if (activeResolver) {
    const fn = activeResolver;
    activeResolver = null;
    fn(result);
  }
}

function showModal(d, resolver) {
  // If there was an existing pending dialog, dismiss it cleanly first
  if (activeResolver) {
    const prevResolver = activeResolver;
    activeResolver = null;
    prevResolver(null);
  }
  activeDialog = d.dialog;
  activeResolver = resolver;
  d.dialog.style.display = "flex";
}

function customConfirm(message, titleKey) {
  return new Promise(resolve => {
    if (!CD) initDialogs();
    CD.title.textContent = resolveTitle(titleKey, "confirmTitle");
    CD.msg.textContent = message || "";
    CD.cancel.style.display = "inline-flex";
    CD.cancel.textContent = (typeof t === "function") ? t("cancelBtn") : "Cancel";
    CD.ok.textContent = (typeof t === "function") ? t("okBtn") : "OK";
    showModal(CD, resolve);
    CD.ok.focus();
  });
}

function customAlert(message, titleKey) {
  return new Promise(resolve => {
    if (!CD) initDialogs();
    CD.title.textContent = resolveTitle(titleKey, "alertTitle");
    CD.msg.textContent = message || "";
    CD.cancel.style.display = "none";
    CD.ok.textContent = (typeof t === "function") ? t("okBtn") : "OK";
    showModal(CD, () => resolve(true));
    CD.ok.focus();
  });
}

function customPrompt(message, defaultValue, titleKey) {
  return new Promise(resolve => {
    if (!PD) initDialogs();
    PD.title.textContent = resolveTitle(titleKey, "promptTitle");
    PD.msg.textContent = message || "";
    PD.cancel.textContent = (typeof t === "function") ? t("cancelBtn") : "Cancel";
    PD.ok.textContent = (typeof t === "function") ? t("okBtn") : "OK";
    PD.input.value = defaultValue ?? "";
    showModal(PD, resolve);
    setTimeout(() => {
      PD.input.focus();
      PD.input.select();
    }, 20);
  });
}

function setupDialogButtons() {
  if (!CD || !PD) initDialogs();

  [CD.dialog, PD.dialog].forEach(d => {
    d.addEventListener("click", e => {
      if (e.target === d) {
        closeDialog(d === CD.dialog ? false : null);
      }
    });
  });

  CD.ok.onclick = () => closeDialog(true);
  CD.cancel.onclick = () => closeDialog(false);

  PD.ok.onclick = () => closeDialog(PD.input.value);
  PD.cancel.onclick = () => closeDialog(null);

  PD.input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      closeDialog(PD.input.value);
    }
  });

  document.addEventListener("keydown", e => {
    if (!activeDialog) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeDialog(activeDialog === CD.dialog ? false : null);
    } else if (e.key === "Enter" && activeDialog === CD.dialog) {
      e.preventDefault();
      closeDialog(true);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initDialogs();
    setupDialogButtons();
  });
} else {
  initDialogs();
  setupDialogButtons();
}

window.customConfirm = customConfirm;
window.customPrompt = customPrompt;
window.customAlert = customAlert;
