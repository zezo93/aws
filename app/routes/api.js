var path             = require('path');
var User       = require("../models/User");
var Notifications = require("../models/Notifications");
var Orders = require("../models/Orders");
var Client = require("../models/Client");
var Logs = require("../models/Logs");
var config       = require("../config");
var jwt        = require('jsonwebtoken');
var util       = require('util');
var secret     = 'whatever';
var mongoose = require('mongoose');
var date = new Date().toJSON().split('T')[0];


module.exports = function(router) {


  //verfiy token
  router.use(function (req,res,next) {
  var token = req.body.token || req.body.query || req.headers['x-access-token'];
      if (token) {
          jwt.verify(token,secret,function (err,decoded) {
              if(err){
                  res.json({success:false, message:"invalid or expired token"});
              } else {
                req.decoded = decoded;
                next();
              }
          });
      } else {
        res.json({success:false, message:"No token provided"});
      }
  });

  //http://localhost:3000/api/orders/
  //user Registration Route
  router.post('/users',function(req,res){
        var user = new User(req.body);
        user.save().then(function (doc) {
              saveLog(req.decoded.UserName,"اضافة مستخدم")
              res.json({success:true, user:user, message:'تم اضافة المستخدم'});
        }).catch(err=>{
          console.log(err);
          res.json({success:false, user:user, message:'خطأ في تسجيل المستخدم'});

        });
});

var saveLog = function (UserName,Action,Note) {
  console.log();
  var log = new Logs();
  log.UserName = UserName;
  log.Action = Action;
  log.Note = Note;
  log.save()
}

router.get('/users',function(req,res){
  User.find({}).then(function (users) {
       res.json({success:true, users:users});
    },function(err) {
        res.json({success:false, message:"حدث خطأ اثناء العملية"});
    });
    });

router.get('/logs',function(req,res){
  Logs.find({}).sort([['Date', 1]]).then(function (logs) {
       res.json({success:true, logs:logs});
    },function(err) {
        res.json({success:false, message:"حدث خطأ اثناء العملية"});
    });
    });

router.get('/orders/',function(req,res){
       Orders.find({}).sort('date').then(function (orders) {
          res.json({success:true, orders:orders});
        }).catch(err=>{
          res.json({success:false, message:'خطأ في الحصول على الطلبات'});
        });
    });

  router.get('/clients/',function(req,res){
    Client.find({}).then(function (clients,err) {
            res.json({success:true, clients:clients});
          }).catch(err=>{
            res.json({success:false, message:'خطأ في الحصول على الزبائن'});
          });
      });

  router.post('/orders/',function(req,res){
        var order = new Orders(req.body);
        if(req.body.Client){
          newClient = new Client(req.body.Client);
          newClient.save().then(function (client,err) {
            if (client) {
              order.ClientId = client._id
            }
            order.save().then(function (order, err) {
              if (err) {
                res.json({success:false,  message:"لم يتم حفظ الطلب"});
              }else {
                res.json({success:true, order:order, message:"تم حفظ الطلب"})
              }
            }).catch(function (err) {
              res.json({success:false , err:"لم يتم حفظ الطل"});
            });
          }).catch(function (err) {
            res.json({success:false , err:err,  message:"لم يتم حفظ الطلب"});
          });
        }else{
          order.save().then(function (order, err) {
            if (err) {
              res.json({success:false, err:err,  message:"لم يتم حفظ الطلب"});
            }else {
              saveLog(req.decoded.UserName,"اضافة طلب")

              res.json({success:true, order:order, message:"تم حفظ الطلب"})
            }
          }).catch(function (err) {
            res.json({success:false , err:err,  message:"لم يتم حفظ الطلب"});
          });
        }
    });

    router.put('/orders/status/',function(req,res){
      var id = req.body.orderId;
      var status = req.body.Status;
       Orders.findOneAndUpdate({_id:id},{$set:{Status:status}},{new: true}).then(function(order) {
         saveLog(req.decoded.UserName," تعديل حالة الطلب")
         res.json({success:true, order:order, message:"تم تعديل حالة الطلب"});
       }).catch(function (err) {
         res.json({success:false , err:err});
       });

      });

      router.put('/orders/price/',function(req,res){
        console.log(req.body);
        var id = req.body.orderId;
        var Price = req.body.Price;
         Orders.findOneAndUpdate({_id:id},{$set:{TotalPrice:Price}},{new: true}).then(function(order) {
           saveLog(req.decoded.UserName,"تعديل سعر الطلب")
           res.json({success:true, order:order, message:"تم تعديل السعر"});
         }).catch(function (err) {
           res.json({success:false , err:err});
         });
        });

    router.put('/orders/payments/',function(req,res){
      var id = req.body.orderId;
      var Ammount = req.body.Ammount;
      Orders.findOneAndUpdate({_id:id},{$push:{Payments:{Ammount:Ammount}}},{new: true}).then(function(order) {
        saveLog(req.decoded.UserName,"اضافة دفعة")
         res.json({success:true, order:order, message:"تم اضافة دفعة جديدة"});
       }).catch(function (err) {
         res.json({success:false , err:err});
       });
      });

      router.put('/orders/delete-payments/',function(req,res){
        var id = req.body.orderId;
        var payment_id = req.body.payment_id;
        Orders.findOneAndUpdate({_id:id},{$pull:{Payments:{_id:payment_id}}},{new: true}).then(function(order) {
          saveLog(req.decoded.UserName,"حذف دفعة")
           res.json({success:true, order:order, message:"تم حذف دفعة"});
         }).catch(function (err) {
           res.json({success:false , err:err});
         });
        });

      router.put('/orders/client/',function(req,res){
        var client = req.body;
        Client.findOneAndUpdate({_id:client._id},{
          $set:{
            Name:client.Name,
            Address:client.Address,
            Tel1:client.Tel1,
            Tel2:client.Tel2,
            Fax:client.Fax,
            Email:client.Email,
        }},{new: true}).then(function(client) {
           res.json({success:true, client:client, message:"تم تعديل الزبون بنجاح"});
         }).catch(function (err) {
           res.json({success:false , err:err});
         });
        });

        router.put('/orders/delete-items/',function(req,res){
          var id = req.body.orderId;
          var itemId = req.body.itemId;
          Orders.findOneAndUpdate({_id:id},{$pull:{Items:{_id:itemId}}},{new: true}).then(function(order) {
            saveLog(req.decoded.UserName,"حذف عينة")

             res.json({success:true, order:order, message:"تم حذف العينة"});
           }).catch(function (err) {
             res.json({success:false , err:err});
           });
          });

      router.put('/orders/put-items/',function(req,res){
        var id = req.body.orderId;
        var item = req.body.item;

        if(item._id){
        Orders.update({"Items._id":item._id},{$set:{"Items.$":item}},{new: true}).then(function(order) {
          saveLog(req.decoded.UserName,"تحديث عينة")

           res.json({success:true, order:order, message:"تم تحديث العينة"});
         }).catch(function (err) {
           res.json({success:false , err:err});
         });
       }else {
         Orders.findOneAndUpdate({_id:id},{$push:{Items:item}},{new: true}).then(function(order) {
           saveLog(req.decoded.UserName,"اضافة عينة")
            res.json({success:true, order:order, message:"تم اضافة عينة"});
          }).catch(function (err) {
            res.json({success:false , err:err});
          });
       }
        });

    router.put('/orders/files/',function(req,res){
      config.upload(req, res, function (err) {
         if (err) {
            if (err.code ==='filetype') {
              res.json({success:false, err:err, message:"فقط ملفات الصور والمستندات"});
            } else {
              console.log(err);
              res.json({success:false, err:err, message:"خطأ في تحميل الملف"});
            }
         }else{
           var id = req.body.orderId;
            Orders.findOneAndUpdate({_id:id},{$push:{files:{fileName:req.file.filename,
              filePath:req.file.path,
              fileSize:req.file.size,
              fileMimetype:req.file.mimetype}}},{new: true}).then(function(order) {
                saveLog(req.decoded.UserName,"تحميل ملف")

              res.json({success:true, order:order, message:"تم تحميل الملف بنجاح"});
            }).catch(function (err) {
              res.json({success:false , err:err});
            });
           }
       });
      });

  //user Login Route
  // http://localhost:3000/api/authenticate

  router.post('/authenticate',function(req,res){
    //here th check our local costmers
     User.findOne({UserName:req.body.UserName}).then(function(user){
       flage=false;
       message="Invalid username";
       token = {};
     if(user){
       if (req.body.Password) {
           var ValidPassword = user.comparePassword(req.body.Password);
           if(ValidPassword){
             var token = jwt.sign({UserName:user.UserName, Role:user.Role}, secret, { expiresIn: '24h' });
                flage=true;
                message="user authenticated";
                userNameAuthenticated = user.UserName ;
               res.json({success:flage, message:message, token:token});
             }else {
               flage=false;
               message="invalid password";
                res.json({success:flage, message:message});
             }
           }else {
             flage=false;
             message="Password was not provided";
              res.json({success:flage, message:message});
           }
         }
         res.json({success:flage, message:message});
     });
  });



//current user route
  router.post('/me',function (req,res) {
    res.send(req.decoded);
    console.log();
  });

  return router;
}
