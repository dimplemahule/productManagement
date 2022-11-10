//--------------------requiring modules-------------------
const productModel = require('../model/productModel');
const { uploadFile } = require('./aws')
const { isValidName, isValidObjectId, isValid, isValidNumber } = require('../validation/valid')

//--------------------------------Create Product---------------------------
const createProduct = async function (req, res) {
    try {
        let data = req.body
        let { title, description, price, currencyId, currencyFormat, isFreeShipping, style } = data//destrue of data

        //------------------validation for request body------------------
        if (Object.keys(data).length < 1) { return res.status(400).send({ status: false, message: "Data is required to create a product" }) }

        //------------------validation for title------------------
        if (!isValid(title)) { return res.status(400).send({ status: false, message: "Enter title" }) }
        if (!isValidName(title)) { return res.status(400).send({ status: false, message: "Enter valid title" }) }

        //------------------validation for description------------------
        if (!isValid(description)) { return res.status(400).send({ status: false, message: "Enter description" }) }
        if (!isValidName(description)) { return res.status(400).send({ status: false, message: "Enter valid description" }) }

        //------------------validation for price------------------
        if (!isValid(price)) { return res.status(400).send({ status: false, message: "Enter price" }) }
        if (!isValidNumber(price)) { return res.status(400).send({ status: false, message: "Enter valid price" }) }

        //------------------validation for currencyId------------------
        if (!isValid(currencyId)) { return res.status(400).send({ status: false, message: "Enter currencyId" }) }
        if (currencyId != "INR") { return res.status(400).send({ status: false, message: "Currency must be in INR only" }) }

        //------------------validation for currency format------------------
        if (!isValid(currencyFormat)) { return res.status(400).send({ status: false, message: "Enter currencyFormat" }) }
        if (currencyFormat != "₹") { return res.status(400).send({ status: false, message: "Currency must be in ₹ only" }) }

        //------------------validation for product image------------------
        let productImage = req.files// files is a request body
        if (!(productImage && productImage.length)) { return res.status(400).send({ status: false, message: " Please Provide The Product Image" }) }
        const uploadedproductImage = await uploadFile(productImage[0])
        data.productImage = uploadedproductImage

        //------------------validation for availabel sizes------------------
        let availableSizes = req.body.availableSizes.split(",").map(x => x.trim())
        for (let i = 0; i < availableSizes.length; i++) {
            if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(availableSizes[i]))) {
                console.log(availableSizes[i])
                return res.status(400).send({ status: false, message: "Size should be among ['S','XS','M','X','L','XXL','XL'] only!" })
            }
            if (availableSizes.indexOf(availableSizes[i]) != i) { return res.status(400).send({ status: false, message: "Size not present!" }) }
        }
        data.availableSizes = availableSizes

        //------------------validation for free shipping------------------
        if (typeof isFreeShipping != 'undefined') {
            isFreeShipping = isFreeShipping.trim()
            if (!["true", "false"].includes(isFreeShipping)) { return res.status(400).send({ status: false, message: "isFreeshipping is a boolean type only" }) }
        }

        //------------------validation for style------------------
        if (!isValidName(style)) { return res.status(400).send({ status: false, message: "Enter valid style" }) }

        //------------------db call for making title unique------------------
        let checkTitle = await productModel.findOne({ title: title })
        if (checkTitle) return res.status(400).send({ status: false, message: "Title already exists" })

        let savedata = await productModel.create(data)
        return res.status(201).send({ status: true, message: 'products created successfully', data: savedata })

    } catch (err) {
        res.status(500).send({ status: false, message: err });
    }
}

//--------------------------------Get Product--------------------
const getProduct = async function (req, res) {
    try {
        let filter = {}
        if (req.query) {
            let data = req.query

            let { name, size, priceSort, priceGreaterThan, priceLessThan } = data

            //------------------if we want to filter through title (name)-Dyanamial filter-----------------
            if (name) {
                if (!isValid(name)) { return res.status(400).send({ status: false, message: "Enter product name" }) }
                filter['title'] = name
            }

            //------------------if we want to filter through size------------------
            if (size) {
                if (!isValid(size)) { return res.status(400).send({ status: false, message: "Enter size" }) }
                filter['availableSizes'] = size.toUpperCase()
            }

            //------------------if we want to filter through for price greater than------------------
            if (priceGreaterThan) {
                if (!isValid(priceGreaterThan)) { return res.status(400).send({ status: false, messsage: "Enter value for priceGreaterThan field" }) }
                filter['price'] = { '$gte': priceGreaterThan }
            }

            //------------------if we want to filter through for price less than------------------
            if (priceLessThan) {
                if (!isValid(priceLessThan)) { return res.status(400).send({ status: false, messsage: "Enter value for priceLessThan" }) }
                filter['price'] = { '$lte': priceLessThan }
            }

            if (priceLessThan && priceGreaterThan) { filter['price'] = { '$lte': priceLessThan, '$gte': priceGreaterThan } }

            if (priceSort) {
                if ((priceSort == 1 || priceSort == -1)) {
                    let filterProduct = await productModel.find({ filter, isDeleted: false }).sort({ price: priceSort })
                    if (!filterProduct) {
                        return res.status(404).send({ status: false, message: "No products found with this query" })
                    }
                    return res.status(200).send({ status: true, message: "Success", data: filterProduct })
                }
                return res.status(400).send({ status: false, message: "priceSort must have 1 or -1 as input" })
            }
        }

        //------------------id isdeleted is false then given all data------------------
        if (Object.keys(filter).length > 0) {
            let filterProduct = await productModel.find({ $and: [filter, { isDeleted: false }] })
            if (filterProduct.length <= 0) { return res.status(404).send({ status: false, message: "No products found with given query" }) }
            return res.status(200).send({ status: true, message: "Success", data: filterProduct })
        }

        let findProduct = await productModel.find({ isDeleted: false })
        if (findProduct) {
            return res.status(200).send({ status: true, message: "Success", data: findProduct })
        }
        else {
            return res.status(404).send({ status: false, message: "No products found with this query" })
        }
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

//------------------------Get Product By Param-----------------------------
const getProductByParam = async function (req, res) {
    try {
        let productId = req.params.productId;
        if (!isValidObjectId(productId)) { return res.status(400).send({ status: false, message: 'Please provide valid productId' }) }

        const product = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!product) return res.status(404).send({ status: false, message: "No product found" })
        return res.status(200).send({ status: true, message: 'Success', data: product })
    } catch (err) {
        res.status(500).send({ status: false, error: err.message })
    }
}

//---------------------------------Update Product---------------------
const updateProduct = async function (req, res) {
    try {
        let productId = req.params.productId
        if (!isValidObjectId(productId)) { return res.status(400).send({ status: false, message: 'Please provide valid productId' }) }

        //------------------db call for checking productId------------------
        let checkproduct = await productModel.findById({ _id: productId })
        if (!checkproduct) { return res.status(404).send({ status: false, message: "product not found" }) }

        let productdata = req.body
        let { title, description, price, isFreeShipping, productImage, style, availableSizes } = productdata

        //------------------validation for request body------------------
        if (Object.keys(productdata).length < 1) { return res.status(400).send({ status: false, message: "Insert Data : BAD REQUEST" }); }

        //--------------------if we want to title-------------------
        if (title) {
            if (!isValidName(title)) { return res.status(400).send({ status: false, message: "wrong title" }) }
        }

        //--------------------if we want to description-------------------
        if (description) {
            if (!isValidName(description)) { return res.status(400).send({ status: false, message: "wrong description" }) }
        }

        //--------------------if we want to price-------------------
        if (price) {
            if (!isValidNumber(price)) { return res.status(400).send({ status: false, message: "price is missing" }) }
        }

        //--------------------if we want to free shipping-------------------
        if (typeof isFreeShipping != 'undefined') {
            isFreeShipping = isFreeShipping.trim()
            if (!["true", "false"].includes(isFreeShipping)) { return res.status(400).send({ status: false, message: "isFreeshipping is a boolean type only" }) }
        }

        //--------------------if we want to update address-------------------
        if (productImage) {
            if (!isValidProfile(productImage)) { return res.status(400).send({ status: false, message: "productImage is missing" }) }
        }

        //--------------------if we want to style-------------------
        if (style) {
            if (!isValidName(style)) { return res.status(400).send({ status: false, message: "style is missing" }) }
        }

        //--------------------if we want to available sizes-------------------
        if (availableSizes) {
            let size = ["S", "XS", "M", "X", "L", "XXL", "XL"];
            if (!size.includes(availableSizes))
                return res.status(400).send({ status: false, msg: "Invalid size,select from 'S','XS',M','X','L','XXL','XL'" });
        }

        let UpdateProductData = await productModel.findOneAndUpdate({ _id: productId }, productdata, { new: true })
        return res.status(201).send({ status: true, message: "product Updated", productdata: UpdateProductData })

    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

//--------------------------------deleteProduct-----------------------
const deleteProduct = async function (req, res) {
    try {
        let ProductId = req.params.productId
        let date = new Date()

        //------------------db to verify productId------------------
        let Product = await productModel.findOne({ _id: ProductId, isDeleted: false })
        if (!Product) { return res.status(404).send({ status: false, message: "Product not exist in DB" }) }

        let check = await productModel.findOneAndUpdate({ _id: ProductId }, { isDeleted: true, deletedAt: date }, { new: true })
        return res.status(200).send({ status: true, message: "success", data: check })

    } catch (err) {
        res.status(500).send({ status: false, message: err })
    }
}

//----------------------making apis public---------------------
module.exports = { createProduct, deleteProduct, getProductByParam, getProduct, updateProduct }