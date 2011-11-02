//     Whoops-logger.js 0.0.1
//     (c) 2011 Evgeniy Solovyov
//     This is plugin that helps to save logs to whoops log server
//     For all details and documentation:
//
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

  //function to create logger
  //only name is required
  //logger object is returned
  //You may then use Whoops.log(name, data) of logger_object.log(data) to log something
  Whoops.create_logger = function(name, default_attributes){
    if (name== undefined) {console.log('Logger can\'t be created as name was not provided');return false;}

    default_attributes || (default_attributes = {});

    Whoops.loggers[name] = new Whoops.Logger(name,default_attributes);
    return Whoops.loggers[name];
  };

  //function to send log message
  Whoops.log = function(logger_name, raw_data){
    logger_name || (logger_name = 'default::basic');
    raw_data || (raw_data = {});

    Whoops.loggers[logger_name].log(raw_data);
  };

  //Logger class
  Whoops.Logger = function(name, default_attributes){
    var self = this;
    self.name = name;
    self.message_builders = {};
    self.default_attributes = default_attributes || (default_attributes = {});

    self.build = function(message,raw_data){
      _.each(_(this.message_builders).keys(), function(message_builder_name){
        console.log(message_builder_name);
        self.message_builders[message_builder_name](message,raw_data);
      });
    };

    self.add_message_builder = function(name, callback){
      this.message_builders[name] = callback;
    };

    self.log = function(raw_data){
      var message_creator = new Whoops.MessageCreator();
      var message = message_creator.create(this, raw_data);
      if (!message.ignore) this.send_message(message);
    };

    self.send_message = function(message){
      console.log(message);
      console.log(message.to_hash());
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

  //message creator which uses message builders
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

  Whoops.MessageSender = {


    'send_message': function(data){
//      var data = prepare_data(data);
      var config = {
        "host": "http://localhost:3003"
        ,'noticies_url' : '/events/'
      }
      console.log("Sending request to "+config.host + config.noticies_url+":"+data);

      var options = {};
      options.success = function(jsonResponse){};
      options.error = function(jsonResponse){};
      options.dataType = "json";
      options.crossDomain= true;
      options.type = "POST";
      options.url = config.host + config.noticies_url;
      options.data = {'event':data};
      $.ajax(options);
    }

  };

  //Here we create default logger
  //Also it is a kind of example
  Whoops.default_logger = Whoops.create_logger('default::basic');
  Whoops.default_logger.add_message_builder("use_basic_hash", function(message, raw_data){
    message.event_type             = raw_data.event_type;
    message.service                = raw_data.service;
    message.environment            = raw_data.environment;
    message.message                = raw_data.message;
    message.event_group_identifier = raw_data.event_group_identifier;
    if (raw_data.event_time) message.event_time             = raw_data.event_time;
    message.details                = raw_data.details;
  });
}).call(this);


Whoops.default_logger.log({
  "event_type": "Notice"
  ,"service":'Storyful.web'
  ,"environment":'development'
  ,'message': "Story opened"
  ,'event_group_identifier':"Stories"
  ,'details':{
    'object':'story'
    ,'id':"10012302034"
    ,'url':'http://localhost:3000/stories/1000008635'
    ,'subscription':'pro'
    ,'widget':'Story browser'
  }
});
