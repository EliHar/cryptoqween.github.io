var MAX_NUM_MONITORS = 5;
var DEFAULT_TO_SYMBOL = "USD";
var DEFAULT_EXCHANGE = "CCCAGG";
var DEFAULT_SUB_ID = "5";

var quote = {};
var currentToSymbol = DEFAULT_TO_SYMBOL;
var currentExchange = DEFAULT_EXCHANGE;
var currentSubscriptionId = DEFAULT_SUB_ID;

// TODO: Add support for "current" data model
var createDom = function(wrapperId) {
	var wrapper = document.createElement("div");
	wrapper.id = wrapperId;
	wrapper.className = "wrapper";
	var html = '';
	html += '<h1><span id="fsym_'+ wrapperId +'"></span> - <span id="tsym_'+ wrapperId +'"></span>   <strong><span class="price" id="price_'+ wrapperId +'"></span></strong></h1>';
	html += '<div class="label">24h Change: <span class="value" id="change_'+ wrapperId +'"></span> (<span class="value" id="changepct_'+ wrapperId +'"></span>)</div>';
	html += '<div class="label">Last Market: <span class="market" id="market_'+ wrapperId +'"></span></div>';
	html += '<div class="label">Last Trade Id: <span class="value" id="tradeid_'+ wrapperId +'"></span></div>';
	html += '<div class="label">Last Trade Volume: <span class="value" id="volume_'+ wrapperId +'"></span></div>';
	html += '<div class="label">Last Trade VolumeTo: <span class="value" id="volumeto_'+ wrapperId +'"></span></div>';
	html += '<div class="label">24h Volume: <span class="value" id="24volume_'+ wrapperId +'"></span></div>';
	html += '<div class="label">24h VolumeTo: <span class="value" id="24volumeto_'+ wrapperId +'"></span></div>';
	wrapper.innerHTML = html;
	return wrapper;
};

var clearMonitors = function() {
	document.getElementById("content").innerHTML = "";
}

var displayQuote = function(_quote) {
	if (_quote ===  undefined) {
		return;
	}
	// var pair = _quote.FROMSYMBOL + _quote.TOSYMBOL;
	var fsym = CCC.STATIC.CURRENCY.SYMBOL[_quote.FROMSYMBOL];
	var tsym = CCC.STATIC.CURRENCY.SYMBOL[_quote.TOSYMBOL];

	document.getElementById("market_" + _quote.FROMSYMBOL).innerHTML = _quote.LASTMARKET;
	document.getElementById("fsym_" + _quote.FROMSYMBOL).innerHTML = _quote.FROMSYMBOL;
	document.getElementById("tsym_" + _quote.FROMSYMBOL).innerHTML = _quote.TOSYMBOL;
	document.getElementById("price_" + _quote.FROMSYMBOL).innerHTML = _quote.PRICE;
	document.getElementById("volume_" + _quote.FROMSYMBOL).innerHTML = CCC.convertValueToDisplay(fsym, _quote.LASTVOLUME);
	document.getElementById("volumeto_" + _quote.FROMSYMBOL).innerHTML = CCC.convertValueToDisplay(tsym, _quote.LASTVOLUMETO);
	document.getElementById("24volume_" + _quote.FROMSYMBOL).innerHTML = CCC.convertValueToDisplay(fsym, _quote.VOLUME24HOUR);	
	document.getElementById("24volumeto_" + _quote.FROMSYMBOL).innerHTML = CCC.convertValueToDisplay(tsym, _quote.VOLUME24HOURTO);
	
	if (_quote.LASTTRADEID !== undefined){
		document.getElementById("tradeid_" + _quote.FROMSYMBOL).innerHTML = _quote.LASTTRADEID.toFixed(0);
	} else {
		document.getElementById("tradeid_" + _quote.FROMSYMBOL).innerHTML = "N/A"
	}

	document.getElementById("change_" + _quote.FROMSYMBOL).innerHTML = CCC.convertValueToDisplay(tsym, _quote.CHANGE24H);
	document.getElementById("changepct_" + _quote.FROMSYMBOL).innerHTML = _quote.CHANGEPCT24H.toFixed(2) + "%";

	if (_quote.FLAGS === "1"){
		document.getElementById("price_" + _quote.FROMSYMBOL).className = "up";
	} 
	else if (_quote.FLAGS === "2") {
		document.getElementById("price_" + _quote.FROMSYMBOL).className = "down";
	}
	else if (_quote.FLAGS === "4") {
		document.getElementById("price_" + _quote.FROMSYMBOL).className = "";
	}
}

var updateQuote = function(result) {
	var content = document.getElementById("content");
	var numMonitors = content.children.length;
	var keys = Object.keys(result);
	// var pair = result.FROMSYMBOL + result.TOSYMBOL;
	if (!quote.hasOwnProperty(result.FROMSYMBOL)) {
		quote[result.FROMSYMBOL] = {};
		if (content.children.length < 6) {
			content.appendChild(createDom(result.FROMSYMBOL));
		}
	}

	for (var i = 0; i <keys.length; ++i) {
		quote[result.FROMSYMBOL][keys[i]] = result[keys[i]];
	}
	quote[result.FROMSYMBOL]["CHANGE24H"] = quote[result.FROMSYMBOL]["PRICE"] - quote[result.FROMSYMBOL]["OPEN24HOUR"];
	quote[result.FROMSYMBOL]["CHANGEPCT24H"] = quote[result.FROMSYMBOL]["CHANGE24H"]/quote[result.FROMSYMBOL]["OPEN24HOUR"] * 100;
	displayQuote(quote[result.FROMSYMBOL]);
}

var socket = io.connect('https://streamer.cryptocompare.com/');
//Format: {SubscriptionId}~{ExchangeName}~{FromSymbol}~{ToSymbol}
//Use SubscriptionId 0 for TRADE, 2 for CURRENT and 5 for CURRENTAGG
//For aggregate quote updates use CCCAGG as market
var subscription = [];

// Only if picking a new to symbol
var updateToSym = function(toSymbol) {
	if (subscription.length > 0 && subscription[0].indexOf(toSymbol) == -1) {
		quote = {};
		updateSubscription(currentSubscriptionId, currentExchange, toSymbol);
		currentToSymbol = toSymbol;
	}
}

// TODO: Add support for multiple exchange
var updateExchange = function(exchange) {
	if (subscription.length > 0 && subscription[0].indexOf(exchange) == -1) {
		quote = {};
		updateSubscription(0, exchange, currentToSymbol);
		currentExchange = exchange;
	}
}

var updateSubscription = function(subID, exchange, toSymbol) {
	socket.emit('SubRemove', { subs: subscription } );
	subscription = [subID + '~' + exchange + '~BTC~' + toSymbol, subID + '~' + exchange + '~ETH~' + toSymbol, subID + '~' + exchange + '~LTC~' + toSymbol, subID + '~' + exchange + '~ZEC~' + toSymbol, subID + '~' + exchange + '~ETC~' + toSymbol, subID + '~' + exchange + '~DASH~' + toSymbol];
	socket.emit('SubAdd', { subs:subscription });
}

var init = function() {
	updateSubscription(DEFAULT_SUB_ID, DEFAULT_EXCHANGE, DEFAULT_TO_SYMBOL);
}

socket.on("connect", function() {
	// console.log("Socket connected...");
});

socket.on("disconnect", function(){
	// console.log("Socket disconnected.");	
});

// TODO: Add support for "current" data model
socket.on("m", function(message){
	var messageType = message.substring(0, message.indexOf("~"));
	var res = {};
	if (messageType === CCC.STATIC.TYPE.CURRENTAGG) {
		res = CCC.CURRENT.unpack(message);
		updateQuote(res);
	}					
});
