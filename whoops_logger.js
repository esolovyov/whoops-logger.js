//     Whoops-logger.js 0.0.1
//     (c) 2011 Evgeniy Solovyov
//     This is plugin that helps to save logs to whoops log server
//     For all details and documentation: https://github.com/lunsher/whoops-logger.js
//
//  Usage:
// 1. Include undesrscore.js, jQuery and this script itself and then
// Whoops.whoops_srv_cfg = {
//  host: "http://someserver.com"
// }
// 2. Create one or more loggers:
// Whoops.create_logger(logger_name,{default_attributes - hash})
// or without defaults Whoops.create_logger(logger_name)
// These functions will return loggers objects but it is not nesessary - see below "Perform logging"
// Ex:
// var new_logger =  Whoops.create_logger('my_super_logger',{
//    "event_type": "Notice"
//    ,"service":'MyApplication.Web'
//    ,"environment":'production'
//    ,'message': "Notification about something"
//    ,'event_group_identifier':"Web"
//  });
// 3. Perform logging
// 3.1 Using logger object
// new_logger.log(data_hash);
// 3.2 Using Whoops
// Whoops.log(logger_name,data_hash);
// 4. Data hash  consists of following properties
//  data_hash = {
//    "event_type": "",
//    "service":"",
//    "environment":"",
//    "message":"",
//    "event_group_identifier":"",
//    "event_time":"",
//    "details":""
//  }

(function() {

  // Initial Setup
  // -------------
  // Save a reference to the global object.
  var root = this;

  // The top-level namespace. All public Whoops classes and modules will
  // be attached to this.
  var Whoops;

  Whoops = root.Whoops = {};

  //require Underscore library
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore')._;

  //local jQuery library
  var $ = root.jQuery || root.Zepto;

  //Collection of loggers
  Whoops.loggers = {};

  //configuration of connection to Whoops server
  Whoops.whoops_srv_cfg;

  // Function to create logger
  // Params: name - required, default_attributes - optional
  // Returns: logger object
  // You may then use Whoops.log(name, data) or logger_object.log(data) to log something
  Whoops.create_logger = function(name, default_attributes){
    if (name== undefined) {console.log('Logger can\'t be created as name was not provided');return false;}

    default_attributes || (default_attributes = {});

    Whoops.loggers[name] = new Whoops.Logger(name,default_attributes);
    //create basic logger - probably make it switchable by params
    Whoops.loggers[name].add_message_builder("use_basic_hash", function(message, raw_data){
      message.event_type             = raw_data.event_type;
      message.service                = raw_data.service;
      message.environment            = raw_data.environment;
      message.message                = raw_data.message;
      message.event_group_identifier = raw_data.event_group_identifier;
      if (raw_data.event_time) message.event_time             = raw_data.event_time;
      message.details                = raw_data.details;
    });
    return Whoops.loggers[name];
  };

  // Function to send log message
  // Params: logger_name, data to log
  Whoops.log = function(logger_name, raw_data){
    logger_name || (logger_name = 'default::basic');
    raw_data || (raw_data = {});

    Whoops.loggers[logger_name].log(raw_data);
  };

  // Logger class
  // Params: name - name of looger, default_attribute - hash of attrs
  Whoops.Logger = function(name, default_attributes){
    var self = this;
    self.name = name;
    self.message_builders = {};
    self.default_attributes = default_attributes || (default_attributes = {});

    self.build = function(message,raw_data){
      _.each(_(this.message_builders).keys(), function(message_builder_name){
        self.message_builders[message_builder_name](message,raw_data);
      });
    };

    self.add_message_builder = function(name, callback){
      this.message_builders[name] = callback;
    };

    self.log = function(raw_data){
      var message_creator = new Whoops.MessageCreator();
      var attrs = $.extend(self.default_attributes, raw_data);
      var message = message_creator.create(this, attrs);
      if (!message.ignore) this.send_message(message);
    };

    self.send_message = function(message){
      Whoops.MessageSender.send_message(message.to_hash());
    };
  };

  // Message class
  Whoops.Message = function(){
    var self = this;
    self.ATTRIBUTES = [
      "event_type",
      "service",
      "environment",
      "message",
      "event_group_identifier",
      "event_time",
      "details",
      "logger_strategy_name"
    ]
    _.each(this.ATTRIBUTES, function(attribute){ self[attribute] = ""; })

    self.ignore = false;
    self.event_time = (new Date()).toString();


    self.to_hash = function(){
      h = {}
      _.each(this.ATTRIBUTES, function(attribute){h[attribute] = self[attribute];});
      return h;
    }
  };

  // Message creator which uses message builders
  Whoops.MessageCreator = function(){
    var self = this;
    //  raise ArgumentError, "strategy can not be nil" if strategy.nil?
    //  raise ArgumentError, "strategy must respond to 'call'" unless strategy.respond_to?(:call)

    self.create = function(logger,raw_data){
      if (logger== undefined) {console.log('Can\'t send message as Logger Name can\'t be empty');return false;}
      if (raw_data== undefined) {console.log('Can\'t send message as data can\'t be empty');return false;}

      self.logger = logger;
      self.raw_data = raw_data;
      self.message = new Whoops.Message();
      self.message.logger_strategy_name = (logger.name)  ? logger.name : 'anonymous'

      self.logger.build(self.message, self.raw_data);
      return self.message;
    }

    self.should_ignore_message = function(){
      return self.message.ignore;
    }
  };

  // Message sender - performs post request to Whoops server
  Whoops.MessageSender = {
    'send_message': function(data){
      if ((typeof Whoops.whoops_srv_cfg == 'undefined') || (Whoops.whoops_srv_cfg.host == 'undefined')) {console.log('Whoops requires server address to be configured!'); return false;}
      var config = Whoops.whoops_srv_cfg;
      var notices_uri = '/events/';

      console.log("Sending request to "+config.host + notices_uri+":"+data);

      var options = {};
      options.success = function(jsonResponse){};
      options.error = function(jsonResponse){console.log('Whoops error: Server is not acceptable')};
      options.dataType = "json";
      options.crossDomain= true;
      options.type = "POST";
      options.url = config.host + notices_uri;
      options.data = {'event':data};
      $.ajax(options);
    }

  };

  //Here we create default logger
  //Also it is a kind of example
  Whoops.default_logger = Whoops.create_logger('default::basic',{
    "event_type": "Notice"
    ,"service":'Web'
    ,"environment":'development'
    ,'message': "Notification"
    ,'event_group_identifier':"Web"
  });
}).call(this);