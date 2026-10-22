export const money = n => Math.round((Number(n)+Number.EPSILON)*100)/100;
export function emi(principal, annualRate, months) {
 const p=Number(principal), r=Number(annualRate)/1200,n=Number(months);
 if(!Number.isFinite(p)||!Number.isFinite(r)||!Number.isInteger(n)||p<=0||r<0||n<=0) throw Error('Invalid loan terms');
 return money(r===0?p/n:p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1));
}
export function schedule(principal,annualRate,months,start=new Date()) {
 let balance=money(principal);const payment=emi(principal,annualRate,months),r=annualRate/1200,rows=[];
 for(let i=1;i<=months;i++) {let interest=money(balance*r), principalPart=i===months?balance:Math.min(balance,money(payment-interest));let amount=money(principalPart+interest);balance=money(Math.max(0,balance-principalPart));let date=new Date(start);date.setUTCMonth(date.getUTCMonth()+i);rows.push({installment:i,dueDate:date,amount,principal:principalPart,interest,balance,status:'pending'});}
 return rows;
}
export function riskScore({monthlyIncome,existingEMI=0,creditScore=650},monthlyEMI) {
 const dti=(Number(existingEMI)+monthlyEMI)/Math.max(1,Number(monthlyIncome));const score=Number(creditScore);
 return {dti:money(dti*100),level:score<580||dti>.6?'High':score<700||dti>.4?'Medium':'Low'};
}

// Max share of monthly income that may go to EMIs, tightened for weaker credit.
export function eligibility({monthlyIncome,existingEMI=0,creditScore=650},annualRate,months) {
 const income=Number(monthlyIncome),score=Number(creditScore),r=Number(annualRate)/1200,n=Number(months);
 if(!Number.isFinite(income)||income<0||!Number.isFinite(r)||r<0||!Number.isInteger(n)||n<=0) throw Error('Invalid eligibility inputs');
 const foir=score<580?0.3:score<700?0.4:score<780?0.5:0.55;
 const maxEMI=money(Math.max(0,income*foir-Number(existingEMI)));
 const maxPrincipal=money(r===0?maxEMI*n:maxEMI*(Math.pow(1+r,n)-1)/(r*Math.pow(1+r,n)));
 return {foir:foir*100,maxEMI,maxPrincipal,eligible:maxEMI>0&&score>=550,grade:score>=780?'Excellent':score>=700?'Good':score>=580?'Fair':'Poor'};
}
export function prepayment(balance,annualRate,remainingMonths,extra) {
 const b=Number(balance),x=Number(extra),r=Number(annualRate)/1200,n=Number(remainingMonths);
 if(!(b>0)||!(x>0)||x>b) throw Error('Prepayment must be between 0 and the outstanding balance');
 const before=emi(b,annualRate,n),newBalance=money(b-x);
 if(newBalance===0) return {before,reducedEMI:0,interestSaved:money(before*n-b),monthsSaved:n,newMonths:0};
 const reducedEMI=emi(newBalance,annualRate,n);
 // Keep paying the same EMI on the reduced balance until it is cleared.
 let left=newBalance,interest=0,newMonths=0;
 while(left>0.005&&newMonths<n){const i=left*r;interest+=i;left-=Math.min(left,before-i);newMonths++}
 return {before,reducedEMI,newMonths,monthsSaved:n-newMonths,interestSaved:money(before*n-b-interest)};
}
