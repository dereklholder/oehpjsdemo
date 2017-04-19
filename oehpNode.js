var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var querystring = require("querystring");
var https = require("https");
var url = require('url');
var allowCrossDomain = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    next();
}

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.listen(3000, function() {
    console.log("started on port 3000");
});

//When Payment completes, OEHP redirects to return_url (GET), when GET is received, parses the orderID and peforms query
app.get('/result', function(req, response){
    var orderid = req.query.order_id;
    var post_data = querystring.stringify({
        'account_token' : 'C9CBE35FCE67540F328FE4FC8758AF6DCECC24954FB2C4FFE4A24F2B81D95FEA9953BC5CF45601D078',
        'charge_type' : 'QUERY_PAYMENT',
        'transaction_type' : 'CREDIT_CARD',
        'order_id' : orderid,
        'full_detail_flag' : 'true'
    });
    //post options for Query_payment
    var post_options = {
	 host: 'ws.test.paygateway.com',
	 port: 443,
	 path: '/api/v1/transactions',
	 method: 'POST',
	 headers: {
		 'Content-Type': 'application/x-www-form-urlencoded',
		 'Content-Length': Buffer.byteLength(post_data, 'utf8')
	    }
    };
    //Sends Query_Payment request to gateway.
    var post_req = https.request(post_options, function(res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
        console.log('Response:' + chunk); 
        var paymentStateParse = {}; //Parses Payment State from result of QueryPayment.
        chunk.split('&').forEach(function(x){
            var arr = x.split('=');
            arr[1] &&(paymentStateParse[arr[0]] = arr[1]);
        });
        console.log(paymentStateParse.state);
        if (paymentStateParse.state == 'payment_approved' || paymentStateParse.state == 'payment_deposited')
        {
            response.end('Your payment Was approved!');
        }
        if (paymentStateParse.state == 'credit_refunded')
        {
            response.end('Credit was successfully refunded!');
        }
        else
        {
            response.end('Payment was not approved. Please Try again.')
        }
        });
    });

    post_req.write(post_data);
    post_req.end();

});


app.get('/', function(req,res){
    res.sendFile(__dirname + '/index.html');
});
//HTML page posts to /PAYMENT with variables, this formats the requests, sends the request to OEHP, then provides back the URL that is needed to render the payment page.
app.post('/payment', function(req, response){
    var orderid = req.body.orderid;
    var amount = req.body.amount;
    var entrymode = req.body.entrymode;
    var chargetype = req.body.chargetype;
    console.log("Order ID= " +orderid+", Amount =" +amount+ "Entry Mode=" +entrymode+ "Charge Type=" +chargetype);
    //Parameters for a simple Credit_card Transaction
    var post_data = querystring.stringify({
	'account_token' : 'C9CBE35FCE67540F328FE4FC8758AF6DCECC24954FB2C4FFE4A24F2B81D95FEA9953BC5CF45601D078', //Account Token Should be Configured with your own testing account token.
	'transaction_type' : 'CREDIT_CARD',
	'entry_mode' : entrymode,
	'charge_type' : chargetype,
	'order_id' : orderid,
	'manage_payer_data' : 'true',
	'return_url' : 'http:/localhost:3000/result',
    'return_target': '_self',
	'charge_total' : amount,
    'disable_framing': 'false',
    //These Parameters are for customiziing the visible forms on the field.
    'bill_customer_title_visible' : 'false',
    'bill_first_name_visible' : 'false',
    'bill_last_name_visible' : 'false',
    'bill_middle_name_visible' : 'false',
    'bill_company_visible' : 'false',
    'bill_address_one_visible' : 'false',
    'bill_address_two_visible' : 'false',
    'bill_city_visible' : 'false',
    'bill_state_or_province_visible' : 'false',
    'bill_country_code_visible' : 'false',
    'bill_postal_code_visible' : 'false',
    'order_information_visible' : 'false',
    'card_information_visible' : 'false',
    'card_information_label_visible' : 'false',
    'customer_information_visible': 'false'
    });
//Setting Headers and Post Options for the Transaction Request
 var post_options = {
	 host: 'ws.test.paygateway.com',
	 port: 443,
	 path: '/HostPayService/v1/hostpay/transactions',
	 method: 'POST',
	 headers: {
		 'Content-Type': 'application/x-www-form-urlencoded',
		 'Content-Length': post_data.length
	    }
    };
//Posts request to OEHP, then returns the fully formatted URL that is rendered in the Iframe.
var post_req = https.request(post_options, function(res) {
   res.setEncoding('utf8');
   res.on('data', function (chunk) {
     console.log('Response:' + chunk);
     var obj = JSON.parse(chunk);
     console.log(obj.actionUrl + obj.sealedSetupParameters)
     response.end(obj.actionUrl + obj.sealedSetupParameters);
    });
});
 //post the data
 post_req.write(post_data);
 post_req.end();
});