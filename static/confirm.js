"use strict";
/**
 * Custom shadcn/ui-style confirmation & prompt dialogs.
 * Replaces native window.confirm / window.prompt / window.alert.
 * Async/Promise-based so callers await instead of blocking.
 */

const $c = id => document.getElementById(id);

let CD = null, PD = null;
let _resolve = null;

function initDialogs() {
  CD = { dialog: $c("confirmDialog"), msg: $c("confirmMessage"), title: $c("confirmTitle"), ok: $c("confirmOk"), cancel: $c("confirmCancel") };
  PD = { dialog: $c("promptDialog"), msg: $c("promptMessage"), title: $c("promptTitle"), input: $c("promptInput"), ok: $c("promptOk"), cancel: $c("promptCancel") };
}

function showDialog(d, titleKey) {
  if (typeof t === "function") {
    d.title.textContent = t(titleKey);
    d.cancel.textContent = t("cancelBtn");
    d.ok.textContent = t("okBtn");
  }
  d.dialog.style.display = "flex";
  d.dialog.hidden = false;
  void d.dialog.offsetWidth;
  d.dialog.focus();
}

function hideDialog(d) {
  d.dialog.style.display = "none";
  d.dialog.hidden = true;
}

function customConfirm(message, titleKey) {
  return new Promise(resolve => {
    CD.msg.textContent = message;
    showDialog(CD, titleKey || "confirmTitle");
    _resolve = v => { resolve(v); hideDialog(CD); };
  });
}

function customPrompt(message, defaultValue, titleKey) {
  return new Promise(resolve => {
    PD.msg.textContent = message;
    PD.input.value = defaultValue || "";
    showDialog(PD, titleKey || "promptTitle");
    PD.input.focus();
    PD.input.select();
    _resolve = v => { resolve(v); hideDialog(PD); };
  });
}

function customAlert(message, titleKey) {
  return new Promise(resolve => {
    CD.msg.textContent = message;
    showDialog(CD, titleKey || "confirmTitle");
    CD.ok.textContent = (typeof t === "function") ? t("okBtn") : "OK";
    _resolve = v => { resolve(v); hideDialog(CD); };
  });
}

function setupDialogButtons() {
  [CD.dialog, PD.dialog].forEach(d => {
    d.addEventListener("click", e => {
      if (e.target === d && _resolve) {
        const isConfirm = d === CD.dialog;
        _resolve(isConfirm ? false : null);
      }
    });
  });
  CD.ok.onclick = () => { if (_resolve) _resolve(true); };
  CD.cancel.onclick = () => { if (_resolve) _resolve(false); };
  PD.ok.onclick = () => { if (_resolve) _resolve(PD.input.value); };
  PD.cancel.onclick = () => { if (_resolve) _resolve(null); };
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !CD.dialog.hidden && _resolve) { _resolve(false); }
    if (e.key === "Escape" && !PD.dialog.hidden && _resolve) { _resolve(null); }
    if (e.key === "Enter" && !CD.dialog.hidden && _resolve) { _resolve(true); }
    if (e.key === "Enter" && !PD.dialog.hidden && _resolve) { _resolve(PD.input.value); }
  });
}

initDialogs();
setupDialogButtons();
window.customConfirm = customConfirm;
window.customPrompt = customPrompt;
window.customAlert = customAlert;

