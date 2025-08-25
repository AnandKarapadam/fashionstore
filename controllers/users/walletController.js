const Wallet = require("../../models/walletSchema");
const User = require("../../models/userSchema");
const logger = require("../../utils/logger");

const loadWalletPage = async (req,res)=>{
    try {

        const userId = req.session.user;
        const user = await User.findById(userId);

        const wallet = await Wallet.findOne({userId});
        if (!wallet) {
           wallet = new Wallet({ userId, balance: 0, transactions: [] });
           await wallet.save();
        }

        res.render("user/wallet",{user,wallet});
        
    } catch (error) {
        logger.error("Error:",error.message);
    }
}

const loadTransactionPage = async (req,res)=>{
    try {

        const page = parseInt(req.query.page)||1;
        const limit = 4;
        const skip = (page-1)*limit;


        const userId = req.session.user;
        const user = await User.findById(userId);

        const wallet = await Wallet.findOne({userId});

        if(!wallet){
            return res.render("user/wallettransaction",{
                user,
                transactions:[],
                currentPage:1,
                totalPages:1
            })
        }

        const totalTransactions = wallet.transactions.length;
        const totalPages = Math.ceil(totalTransactions/limit);

        const paginatedTransactions = wallet.transactions.sort((a,b)=>b.date-a.date).slice(skip,skip+limit);

        res.render("user/wallettransaction",{
            user,
            currentPage:page,
            totalPages:totalPages,
            transactions:paginatedTransactions,
            })
        
    } catch (error) {
        logger.error("Error:",error.message);
    }
}

const loadWalletAddMoney = async (req,res)=>{
    try {
        const userId = req.session.user;
        const user = await User.findById(userId)

        res.render("user/walletaddmoney",{user})

    } catch (error) {
        logger.error("Error:",error.message)
    }
}


module.exports = {
    loadWalletPage,
    loadTransactionPage,
    loadWalletAddMoney
}