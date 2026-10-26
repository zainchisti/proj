import test from 'node:test';import assert from 'node:assert/strict';import {emi,schedule,riskScore,eligibility,prepayment} from './logic.js';
test('zero-interest EMI',()=>assert.equal(emi(12000,0,12),1000));
test('amortization pays off balance',()=>assert.equal(schedule(100000,12,12).at(-1).balance,0));
test('high debt-to-income risk',()=>assert.equal(riskScore({monthlyIncome:20000,creditScore:750},15000).level,'High'));
test('eligibility inverts EMI',()=>{const e=eligibility({monthlyIncome:100000,existingEMI:10000,creditScore:750},12,60);assert.equal(e.maxEMI,40000);assert.ok(Math.abs(emi(e.maxPrincipal,12,60)-e.maxEMI)<1)});
test('poor credit is not eligible',()=>assert.equal(eligibility({monthlyIncome:50000,creditScore:500},10,12).eligible,false));
test('prepayment shortens tenure and saves interest',()=>{const p=prepayment(500000,10,60,100000);assert.ok(p.monthsSaved>0);assert.ok(p.interestSaved>0);assert.ok(p.reducedEMI<p.before)});
