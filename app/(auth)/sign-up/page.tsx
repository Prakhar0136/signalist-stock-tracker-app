'use client'
import { CountrySelectField } from "@/components/forms/CountrySelectField";
import FooterLink from "@/components/forms/FooterLink";
import InputField from "@/components/forms/InputField";
import SelectField from "@/components/forms/SelectField";
import { Button } from "@/components/ui/button";
import { INVESTMENT_GOALS, PREFERRED_INDUSTRIES, RISK_TOLERANCE_OPTIONS } from "@/lib/constants";
import {useForm } from "react-hook-form"

const SignUp = () => {
  const{
    register,
    handleSubmit,
    control,
    formState:{errors,isSubmitting},
  } = useForm<SignUpFormData>({
    defaultValues:{
    fullName:'',
    email:'',
    password:'',
    country:'India',
    investmentGoals:'Growth',
    riskTolerance:'Medium',
    preferredIndustry:'Technology'
  },
  mode:'onBlur'
  },  );

  const onSubmit = async(data:SignUpFormData)=> {
    try{
        console.log(data)
    }
    catch(e){
        console.error(e)
    }
  }

  return (
    <>
     <h1 className = "form-title">Sig Up & personalise</h1>
     <form onSubmit={handleSubmit (onSubmit)} className= "space-y-5">

            <InputField 
            name = "fullName"
            label = "Full Name"
            placeholder = "Prakhar"
            register = {register}
            error = {errors.fullName}
            validation = {{required:'full name is required',minLength:2}}
            />

            <InputField 
            name = "email"
            label = "Email"
            placeholder = "contact@prakharps.com"
            register = {register}
            error = {errors.email}
            validation = {{required:'email is required',pattern: /^w+@\.\w+$/,message:'email address is required'}}
            />

            <InputField 
            name = "password"
            label = "Password"
            placeholder = "enter strong password"
            type = "password"
            register = {register}
            error = {errors.password}
            validation = {{required:'password is required',minLength:8}}
            />

            <CountrySelectField
            name = "country"
            label = "Country"
            control = {control}
            error = {errors.country}
            required
            />

            <SelectField
            name = "investmentGoals"
            label = "InvestmentGoals"
            placeholder="select your investment goal"
            options = {INVESTMENT_GOALS}
            control = {control}
            error = {errors.investmentGoals}
            required
            />

            <SelectField
            name = "riskTolerance"
            label = "Risk Tolerance"
            placeholder="select your risk level"
            options = {RISK_TOLERANCE_OPTIONS}
            control = {control}
            error = {errors.riskTolerance}
            required
            />

            <SelectField
            name = "preferredIndustry"
            label = "Preferred Industry"
            placeholder="select your preferred industry"
            options = {PREFERRED_INDUSTRIES}
            control = {control}
            error = {errors.preferredIndustry}
            required
            />
            
        <Button type = "submit" disabled = {isSubmitting} className = "yellow-btn w-full mt-5">
            {isSubmitting ? 'Creating account': 'Start your investing journey '}
        </Button>

        <FooterLink text = "already have an account" linkText = "sign in" href = "/sign-in"/>

     </form>
    </>
   
  )}
export default SignUp
