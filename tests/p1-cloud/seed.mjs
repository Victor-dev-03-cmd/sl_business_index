import {http,ok,createUser,saveFixture,readFixture,log} from '../p0/fullstack/helpers.mjs';

const fixture=readFixture();
const c2=await createUser('slbi-p1-customer-two@example.test');
fixture.users.customer2=c2;
ok(await http('/rest/v1/profiles',{role:'service',method:'POST',
  body:{id:c2.id,email:c2.email,role:'customer'},
  headers:{Prefer:'return=representation'}
}),'create second synthetic reviewer');

const insert=await http('/rest/v1/businesses',{role:'service',method:'POST',
  body:{
    owner_id:fixture.users.vendorB.id,name:'Synthetic Approved B',
    status:'approved',description:'P1 review branch fixture',
    address:'Batticaloa, Eastern Province, Sri Lanka',
    detailed_address:'Shop 12, Hospital Road, Batticaloa, Sri Lanka',
    latitude:7.7102,longitude:81.6924,
    location:'SRID=4326;POINT(81.6924 7.7102)',
  },
  headers:{Prefer:'return=representation'},
});
const b=ok(insert,'create approved vendor B business');
fixture.businesses.approvedB=b[0]?.id;

const updated=await http('/rest/v1/businesses?id=eq.'+fixture.businesses.approvedA,{
  role:'service',method:'PATCH',
  body:{
    address:'Jaffna, Northern Province, Sri Lanka',
    detailed_address:'Shop 14, Hospital Road, Jaffna Town, Sri Lanka',
    latitude:9.6615,longitude:80.0255,
    location:'SRID=4326;POINT(80.0255 9.6615)',
  },
  headers:{Prefer:'return=representation'}
});
ok(updated,'assign physical address to existing approved A');

for(const [business,user,comment] of [
  [fixture.businesses.approvedA,fixture.users.customer,'Legacy published A'],
  [fixture.businesses.approvedB,fixture.users.admin,'Legacy published B']
]){
  const row=await http('/rest/v1/reviews',{role:'service',method:'POST',
    body:{business_id:business,user_id:user.id,user_name:'Legacy Writer',rating:4,
      comment,is_approved:true,sentiment:'positive'},
    headers:{Prefer:'return=representation'}});
  ok(row,'preexisting approved customer review');
}
saveFixture(fixture);
log('PASS: disposable real Auth accounts, approved vendors and legacy reviews seeded');
