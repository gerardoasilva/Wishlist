let mongoose = require( 'mongoose');

mongoose.Promise = global.Promise;

let itemCollection = mongoose.Schema({
    wishlist: {
        type: mongoose.Schema.Types.ObjectId, ref: 'wishlists'
    },
    wishName: {
        type: String,
        required: true,
    },
    productImage: {
        type: String,
    },
    priority: {
        type: Number,
        required: true
    },
    notes: {
        type: String
    },
    shoppingURL: {
        type: String,
    },
    isReserved: {
        type: Boolean,
        default: "false",
    },
    creationDate: {
        type: Date,
        default: Date.now,
    }
});

let wishlistCollection = mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId, ref: 'users'
    },
    title: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String
    },
    isPublic: {
        type: Boolean,
        default: "false"
    },
    isSecured: {
        type: Boolean,
        default: "false",
    },
    password: {
        type: String,
    },
    creationDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    // wishes: [ 
    //     {
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: "Item"
    //     }
    //  ]
});

let userCollection = mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    fName: {
        type: String,
        required: true
    },
    lName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    bDate: {
        type: String,
        required: true
    },
    signupDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    // wishlists: [ 
    //     {
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: 'Wishlist'
    //     }
    //  ],
    friends: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            status: Number,
            enums: [
                0, // 'Not friend'
                1, // 'requested'
                2, // 'pendig'
                3  // 'friends'
            ]
        }
    ]
     
});

let User = mongoose.model('users', userCollection);
let Wishlist = mongoose.model('wishlists', wishlistCollection);
let Item = mongoose.model('items', itemCollection);

// Querys
let UserList = {
    getAll : function(){
        return User.find()
        .then( users => {
            return users;
        })
        .catch( error => {
            throw Error(error);
        });
    },
    findByEmail : function( userEmail ){
        return User.findOne({email: userEmail})
            .then( user => {
                return user;
            })
            .catch ( error => {
                return Error ( error );
            });
    },
    create : function( newUser ){
        console.log(newUser);
        return User.create( newUser )
        .then( user => {
            console.log(user);
            return user;
        })
        .catch(error => {
            throw Error(error);
        });
    },
    delete: function( username ){
        return User.deleteOne( {username: username})
            .then( deletedUsr => {
                return deletedUsr;
            })
            .catch( error => {
                throw Error(error);
            })
    },
    update : function( userN, newUser){
        return User.findOneAndUpdate( {username: userN}, newUser )
            .then( user => {
                return user;
            })
            .catch(error => {
                throw Error(error);
            });
    },
    getUserByUsername : function( username ){
        return User.findOne( {username: username} )
        .then( user => {
            return user;
        })
        .catch(error => {  
            throw Error(error);
        });
    }
    
};

let WishlistList = {
    getAll : function(){
        return Wishlist.find()
            .then( wishlists => {
                return wishlists;
            })
            .catch( error => {
                throw Error(error);
            });
    },
    create : function(newWishlist){
        return Wishlist.create( newWishlist )
        .then( addedWishlist => {
            return addedWishlist;
        })
        .catch( error => {
            throw Error(error);
        });
    },
    getAllByAuthor : function(author){
        return Wishlist.find({author: author})
        .populate('author')
        .then( wishlists => {
            return wishlists;
        })
        .catch( error => {
            throw Error(error);
        });
    },
    delete: function(author, title) {
        return Wishlist.deleteOne({author: author, title: title})
        .then(delWishlist => {
            return delWishlist;
        })
        .catch( error => {
            throw Error(error);
        });
    },
    getWishlistByTitle : function( title, author ){
        return Wishlist.findOne( {title: title, author: author} )
        .then( wishlist => {
            return wishlist;
        })
        .catch( error => {
            throw Error(error);
        });
    },
    updateWishlist: function(newWishlist){
        return Wishlist.update()
    }
};

let ItemList = {
    getAll: function() {
        return Item.find()
        .then( wishes => {
            return wishes;
        })
        .catch( error => {
            throw Error(error);
        });
    },
    create: function(newItem){
        return Item.create(newItem)
        .then( addedItem => {
            return addedItem;
        })
        .catch( error => {
            throw Error(error);
        });
    },
    getAllByWishlist : function(wishlist){
        return Item.find({wishlist: wishlist})
        .populate('wishlist')
        .then( items => {
            return items;
        })
        .catch( error => {
            throw Error(error);
        });
    },
    delete: function(wishlist, wishName) {
        return Item.deleteOne({wishName: wishName, wishlist: wishlist})
        .then(deletedItem => {
            return deletedItem;
        })
        .catch( error => {
            throw Error(error);
        });
    }
};

module.exports = {
    UserList, WishlistList, ItemList
};

