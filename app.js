const express= require("express");
const mongoose=require("mongoose");
const campground=require("./models/campGround");
const methodOverride= require("method-override")
const ejsMate= require("ejs-mate")
const catchAsync = require("./utils/catchAsync")
const ExpressError=require("./utils/ExpressError")
const Joi =require("Joi")
const review=require('./models/review')

const app= express()
mongoose.connect('mongodb://localhost:27017/yelp-camp',{
    useNewUrlParser:true,
    useUnifiedTopology:true,
    

});

const db=mongoose.connection;
db.on("error",console.error.bind(console,"connection error:"));
db.once("open",()=>{
    console.log("Database Connected!");
});
const path =require("path");
const { findByIdAndUpdate, validate } = require("./models/campGround");
const { runInNewContext } = require("vm");
const Review = require("./models/review");
app.engine('ejs',ejsMate);
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));


app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
const validateCamp= (req,res,next)=>{
    const campSchema=Joi.object({
        campground:Joi.object({
            title:Joi.string().required(),
            location:Joi.string().required(),
            image:Joi.string().required(),
            price:Joi.number().required().min(0),
            description:Joi.string().required()
        }).required()
       

    })
    const {error}=campSchema.validate();
    if(error){
        const msg=error.details.map(e=>e.message).join(',')
        throw new ExpressError(msg,400)
    }
    else{
        next();
    }

}
const validateReview=(req,res,next)=>{
    const revSchema=Joi.object({
        review:Joi.object({
            rating:Joi.number().required(),
            body:Joi.string().required()

        }).required()
    })
    const {error}=revSchema.validate();
    if(error){
        const msg=error.details.map(e=>e.message).join(',')
        throw new ExpressError(msg,400)
    }
    else{
        next();
    }
}
app.get('/',(req,res)=>{
    res.render('home.ejs')
})
app.get('/campgrounds',catchAsync(async (req,res)=>{
    const CAMP= await campground.find({});
    
    res.render("campgrounds/index",{CAMP})
}))
app.get('/campgrounds/new',async (req,res)=>{
    res.render('campgrounds/new');

})
app.post('/campgrounds',validateCamp, catchAsync(async (req,res)=>{
    
    const campNew= new campground(req.body.campNew);
    await campNew.save();
    res.redirect(`campgrounds/${campNew._id}`)
    
}))
app.get('/campgrounds/:id/edit',catchAsync(async (req,res)=>{
    const campEdit= await campground.findById(req.params.id);
    res.render('campgrounds/edit',{campEdit});

}))
app.post('/campgrounds/:id/reviews',validateReview,catchAsync(async(req,res)=>{
    const campR=await campground.findById(req.params.id);
    const review=new Review(req.body.review);
    campR.reviews.push(review);
    await campR.save();
    await review.save();
    res.redirect(`/campgrounds/${campR._id}`)

    
}))
app.put('/campgrounds/:id', validateCamp, catchAsync(async(req,res)=>{
    const campEdit= await campground.findByIdAndUpdate(req.params.id,{...req.body.campEdit});
    res.redirect(`/campgrounds/${campEdit._id}`)
}))
app.delete('/campgrounds/:id',catchAsync(async(req,res)=>{
    await campground.findByIdAndDelete(req.params.id);
    res.redirect('/campgrounds')
}))
app.get('/campgrounds/:id',catchAsync(async (req,res)=>{
    const campID= await campground.findById(req.params.id).populate('reviews');
    
    
    res.render('campgrounds/show',{campID});
}))
app.delete('/campgrounds/:id/reviews/:revID',catchAsync(async(req,res)=>{
    const {id,revID}=req.params;
    await campground.findByIdAndUpdate(id,{$pull:{reviews:revID}});
    await review.findByIdAndDelete(revID);
    res.redirect(`/campgrounds/${id}`)

}))
app.all('*',(req,res,next)=>{
    next(ExpressError('PAGE NOT FOUND',404))
})
app.use((err,req,res,next)=>{
    const {status=500}=err;
    if(!err.message){
        err.message="Ohhh....Something went wrong"
    }
    res.status(status).render('error',{err})
    
})


app.listen(3000,() =>{
    console.log("listening to port 3000");
})


