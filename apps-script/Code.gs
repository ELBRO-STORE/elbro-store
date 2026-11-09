/**
 * ELBRO STORE — ORDERS DATABASE (Google Apps Script, côté serveur)
 * Reçoit les commandes du site, les valide, les écrit dans Google Sheets, notifie Telegram (optionnel).
 * Mise en place : voir README-DEPLOIEMENT.md. Aucun secret n'est stocké dans ce code : tout passe par « Propriétés du script ».
 */
var CFG = {
  SPREADSHEET_NAME: 'ELBRO STORE — ORDERS DATABASE',
  SHEET: 'ORDERS',
  REQUESTS_SHEET: '_REQUESTS',      // protection contre les doubles envois
  PREFIX: 'ELBRO',
  TZ: 'Africa/Casablanca',
  MAX_LINES: 20, MAX_QTY: 20,
  STATUSES: ['NEW', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  // Anti-falsification des prix : mets ici les MÊMES id/prix que PRODUCT dans le site.
  // Laisse {} pour désactiver ce contrôle (non recommandé).
  CATALOG: { 'ELBRO-001': 499, 'CAP-001': 99, 'HOODIE-001': 249, 'CARGO-001': 199, 'SNEAKERS-001': 199 }
};
var HEADERS = ['Order ID','Order Date','Customer Name','Phone Number','City','Full Address','Product ID','Product Name','Selected Piece','Size','Color','Quantity','Unit Price','Subtotal','Delivery Fee','Total','Customer Notes','Order Status'];

/** À exécuter UNE FOIS depuis l'éditeur : crée le classeur, les en-têtes et la liste de statuts. */
function setup() {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('SPREADSHEET_ID')) { Logger.log('Déjà configuré : ' + SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID')).getUrl()); return; }
  var ss = SpreadsheetApp.create(CFG.SPREADSHEET_NAME);
  var sh = ss.getSheets()[0].setName(CFG.SHEET);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#111111').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  sh.getRange(2, 18, 1000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(CFG.STATUSES, true).build());
  var rq = ss.insertSheet(CFG.REQUESTS_SHEET); rq.getRange(1, 1, 1, 3).setValues([['Request ID', 'Order ID', 'Date']]); rq.hideSheet();
  props.setProperty('SPREADSHEET_ID', ss.getId());
  props.setProperty('ORDER_COUNTER', '0');
  Logger.log('Classeur créé : ' + ss.getUrl());
}

function doGet() { return out({ ok: true, service: 'ELBRO orders endpoint', configured: !!PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') }); }

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    if (!e || !e.postData || e.postData.contents.length > 30000) return out({ ok: false, message: 'Requête invalide.' });
    return out(processOrder(JSON.parse(e.postData.contents)));
  } catch (err) {
    console.error(err);
    return out({ ok: false, message: 'Erreur serveur, veuillez réessayer.' });
  } finally { try { lock.releaseLock(); } catch (x) {} }
}

function processOrder(o) {
  var props = PropertiesService.getScriptProperties(), sid = props.getProperty('SPREADSHEET_ID');
  if (!sid) return { ok: false, message: "Archivage non configuré (lancer setup())." };
  if (o.website) return { ok: false, message: 'Requête refusée.' };                    // honeypot anti-bot
  var err = validate(o); if (err) return { ok: false, message: err };

  var ss = SpreadsheetApp.openById(sid), sh = ss.getSheetByName(CFG.SHEET), rq = ss.getSheetByName(CFG.REQUESTS_SHEET);
  // Doublon : même requestId déjà traité -> on renvoie la commande existante, sans nouvelle ligne
  var last = rq.getLastRow();
  if (last > 1) {
    var rows = rq.getRange(2, 1, last - 1, 2).getValues();
    for (var i = 0; i < rows.length; i++) if (rows[i][0] === o.requestId) return { ok: true, orderId: rows[i][1], duplicate: true };
  }
  var n = parseInt(props.getProperty('ORDER_COUNTER') || '0', 10) + 1;
  var orderId = '#' + CFG.PREFIX + '-' + ('000000' + n).slice(-6);
  var date = Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd HH:mm:ss');
  var c = o.customer, notes = [];
  if (o.notes) notes.push('Notes: ' + o.notes);
  if (o.instructions) notes.push('Livraison: ' + o.instructions);
  if (c.email) notes.push('Email: ' + c.email);
  var fee = (o.deliveryFee === null || o.deliveryFee === undefined) ? 'À confirmer' : Number(o.deliveryFee);
  var total = o.lines.reduce(function (s, l) { return s + l.quantity * l.unitPrice; }, 0) + (typeof fee === 'number' ? fee : 0);

  var data = o.lines.map(function (l, i) {
    return [orderId, date, c.name, c.phone, c.city, c.address, l.productId, l.productName, l.piece, l.size, l.color, l.quantity, l.unitPrice, l.quantity * l.unitPrice,
            i === 0 ? fee : '', i === 0 ? total : '', i === 0 ? notes.join(' | ') : '', 'NEW'];
  });
  var start = sh.getLastRow() + 1, rng = sh.getRange(start, 1, data.length, HEADERS.length);
  // Colonnes texte au format texte : empêche l'interprétation de formules (=, +, -, @)
  [[1, 11], [17, 18]].forEach(function (r) { sh.getRange(start, r[0], data.length, r[1] - r[0] + 1).setNumberFormat('@'); });
  rng.setValues(data);
  rq.appendRow([o.requestId, orderId, date]);
  props.setProperty('ORDER_COUNTER', String(n));
  SpreadsheetApp.flush();
  try { notifyTelegram(orderId, c, o.lines, total); } catch (x) { console.error('Telegram: ' + x); }   // optionnel, n'échoue jamais la commande
  return { ok: true, orderId: orderId };
}

function validate(o) {
  if (!o || typeof o !== 'object') return 'Données manquantes.';
  if (!o.requestId || String(o.requestId).length < 8) return 'Identifiant de requête manquant.';
  var c = o.customer || {};
  ['name', 'phone', 'city', 'address'].forEach(function (k) { c[k] = clean(c[k], 300); });
  c.email = clean(c.email, 120); o.notes = clean(o.notes, 1000); o.instructions = clean(o.instructions, 500);
  if (c.name.length < 3) return 'Nom invalide.';
  if (!/^\+212[5-7]\d{8}$/.test(c.phone)) return 'Numéro de téléphone marocain invalide.';
  if (c.city.length < 2) return 'Ville invalide.';
  if (c.address.length < 8) return 'Adresse invalide.';
  if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) return 'Email invalide.';
  o.customer = c;
  if (!Array.isArray(o.lines) || !o.lines.length || o.lines.length > CFG.MAX_LINES) return 'Panier invalide.';
  var catalog = Object.keys(CFG.CATALOG).length > 0;
  for (var i = 0; i < o.lines.length; i++) {
    var l = o.lines[i];
    ['productId', 'productName', 'piece', 'size', 'color'].forEach(function (k) { l[k] = clean(l[k], 200); });
    l.quantity = Number(l.quantity); l.unitPrice = Number(l.unitPrice);
    if (!l.productId || !l.size || !l.color) return 'Ligne de commande incomplète.';
    if (!(l.quantity >= 1 && l.quantity <= CFG.MAX_QTY && l.quantity % 1 === 0)) return 'Quantité invalide.';
    if (!(l.unitPrice >= 0)) return 'Prix invalide.';
    if (catalog && CFG.CATALOG[l.productId] !== l.unitPrice) return 'Prix ou produit non reconnu : ' + l.productId;
  }
  return null;
}
function clean(v, max) { return String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, max); }
function out(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/** Telegram optionnel : définir TELEGRAM_BOT_TOKEN et TELEGRAM_CHAT_ID dans Propriétés du script. */
function notifyTelegram(orderId, c, lines, total) {
  var p = PropertiesService.getScriptProperties(), token = p.getProperty('TELEGRAM_BOT_TOKEN'), chat = p.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chat) return;
  var text = '🛍️ Nouvelle commande ' + orderId + '\n' + c.name + ' — ' + c.phone + '\n' + c.city + '\n\n' +
    lines.map(function (l) { return '• ' + l.quantity + ' × ' + l.piece + ' (' + l.size + ', ' + l.color + ')'; }).join('\n') + '\n\nTotal : ' + total + ' MAD';
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', { method: 'post', contentType: 'application/json', payload: JSON.stringify({ chat_id: chat, text: text }), muteHttpExceptions: true });
}
