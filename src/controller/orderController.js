const orderModel = require('../model/orderModel');
const cartModel = require('../model/cartModel');
const userModel = require('../model/userModel');
const {isValid,isValidObjectId} = require('../validation/valid')

const createOrder = async (req, res) => {
    try {
      let userId = req.params.userId

      let checkId = await userModel.findById({_id:userId})
      if (!checkId) return res.status(400).send({ status: false, message: 'User Id is not present' })

      let orderData = req.body
      let { cancellable, status} = orderData

     if(cancellable == true && status == "pending"){
      return res.status(400).send({ status: false, message: 'order cannot be cancelled' })
     }
      let cartOrder = await cartModel.findOne({ userId: userId })
      if (!cartOrder) return res.status(400).send({ status: false, message: 'cart is  not present' })

      let total = 0
      for(let i = 0; i < cartOrder.items.length;i++){
        total = total+cartOrder.items[i].quantity
      }
      let totalQuantity = total
  
      let cartTobeOrder = {
        userId: cartOrder.userId,
        items: cartOrder.items,
        totalPrice: cartOrder.totalPrice,
        totalItems: cartOrder.totalItems,
        totalQuantity:totalQuantity,
        cancellable:orderData.cancellable,
        status:orderData.status
  
      }
  
      let orderCreate = await orderModel.create(cartTobeOrder)
      return res.status(201).send({ status: true, message: ' Order successfully created', data: orderCreate })
  
    }
    catch (err) {
      res.status(500).send({ status: false, error: err.message })
    }
  }
//   ========================================
  const updateOrder = async (req, res) => {
    try {
  let userId=req.params.userId
  let checkUserId = await userModel.findById({ _id: userId})
  if (!checkUserId) { return res.status(404).send({ status: false, message: "UserId Do Not Exits" }) }

      let data = req.body;
   let { orderId,status}=data
      //checking for a valid user input
      // if(isValid(data)) return res.status(400).send({ status: false, message: 'Data is required to cancel your order' });
      if (Object.keys(data).length < 1) { return res.status(400).send({ status: false, message: "create order" }) }
      //checking for valid orderId
      // if(isValid(orderId)) return res.status(400).send({ status: false, message: 'OrderId is required and should not be an empty string' });
      // if(!isValidObjectId(orderId)) return res.status(400).send({ status: false, message: 'Enter a valid order-Id' });
  
      //checking if cart exists or not
      let findOrder = await orderModel.findOne({ _id: orderId, isDeleted: false });
      if(!findOrder) return res.status(404).send({ status: false, message: `No order found with this '${orderId}' order-ID` })
  
      
      // if(isValid(status)) return res.status(400).send({ status: false, message: 'Status is required and should not be an empty string' });
  
      //validating if status is in valid format
      if(!(['Pending','Completed','Cancelled'].includes(data.status))) return res.status(400).send({ status: false, message: "Order status should be one of this 'Pending','Completed' and 'Cancelled'" });
  
      let conditions = {};
  
      if(data.status == "Cancelled") {
        //checking if the order is cancellable or not
        if(!findOrder.cancellable) return res.status(400).send({ status: false, message: "You cannot cancel this order" });
        conditions.status = data.status;
      }else{
        conditions.status = data.status;
      }
      
      let resData = await orderModel.findByIdAndUpdate({_id: findOrder._id},conditions,{new: true})
      res.status(200).send({ status: true, message: "Success", data: resData });
    } 
    catch (err) {
      res.status(500).send({ status: false, error: err.message })
    }
  }
  
  module.exports = { createOrder, updateOrder }