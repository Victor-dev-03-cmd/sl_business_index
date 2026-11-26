import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:net';
import {request as httpsRequest} from 'node:https';

const code=readFileSync(new URL('../lib/seo/http-file-proof.ts',import.meta.url),'utf8');

test('Production HTTPS verifier disables Node 24 family auto-selection on pinned IPv4 requests',()=>{
  assert.match(code,/autoSelectFamily:false/);
  assert.match(code,/family:4/);
  assert.match(code,/lookup:\(_host,_options,callback\)=>callback\(null,pinned,4\)/);
  assert.match(code,/isAllowedPublicIPv4\(record.address\)/);
  assert.match(code,/servername:hostname/);
  assert.match(code,/port:443,path:SEO_HTTP_PROOF_PATH/);
  assert.match(code,/agent:false/);
  assert.doesNotMatch(code,/rejectUnauthorized:false|redirect:'follow'/);
});

test('Pinned IPv4 custom lookup is accepted by real Node HTTPS sockets',async()=>{
  const server=createServer(socket=>{
    socket.on('data',()=>socket.destroy());
  });
  await new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
  });
  try{
    const port=server.address().port;
    let observedOptions;
    // A deliberately local, untrusted dummy TCP peer can refuse TLS.
    // We only assert the custom DNS callback is correctly interpreted:
    // Node 20+/24 would otherwise throw ERR_INVALID_IP_ADDRESS *before*
    // connecting. Production still denies private IPs in isAllowedPublicIPv4.
    const error=await new Promise((resolve,reject)=>{
      const req=httpsRequest({
        hostname:'fictional-verification.example',
        servername:'fictional-verification.example',
        port,path:'/',method:'GET',agent:false,
        autoSelectFamily:false,family:4,
        lookup:(_host,options,callback)=>{
          observedOptions=options;
          callback(null,'127.0.0.1',4);
        },
        timeout:2500,
      },response=>{
        response.resume();
        reject(new Error('Unexpected successful TLS connection in test'));
      });
      req.once('timeout',()=>req.destroy(new Error('test_timeout')));
      req.once('error',resolve);
      req.end();
    });
    assert.ok(observedOptions,'Node must call the custom lookup');
    assert.notEqual(observedOptions.all,true,'Single IPv4 mode must not request an array result');
    assert.notEqual(error.code,'ERR_INVALID_IP_ADDRESS',
      'Fixed Node HTTPS should reach a socket, not fail parsing a DNS callback');
    assert.ok(['ECONNRESET','EPROTO','ERR_SSL_WRONG_VERSION_NUMBER','EPIPE','ECONNREFUSED'].includes(error.code),
      `Expected local dummy TLS socket error, got ${error.code}: ${error.message}`);
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
});

test('Node 24 default auto-selection would require different lookup response shape',async()=>{
  const server=createServer(socket=>socket.destroy());
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const port=server.address().port;
    let actualOptions;
    const error=await new Promise(resolve=>{
      const req=httpsRequest({
        hostname:'fictional-verification.example',servername:'fictional-verification.example',
        port,path:'/',method:'GET',agent:false,
        lookup:(_host,options,callback)=>{
          actualOptions=options;
          callback(null,'127.0.0.1',4);
        },
        timeout:2500,
      },response=>response.resume());
      req.once('error',resolve);
      req.once('timeout',()=>req.destroy());
      req.end();
    });
    // On versions enabling family auto-selection, this reproduces the
    // original source bug. Older Node releases still allow the test to pass.
    if(actualOptions?.all===true){
      assert.equal(error.code,'ERR_INVALID_IP_ADDRESS');
    }
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
});
