// ===== গুগল ইন্ডেক্স চেকার (আলাদা Apps Script প্রজেক্ট) =====
const KEY = 'dc2b468c4e4dd8010016c68f';
const SITE_URL = 'https://alamingazi533.github.io/'; // Search Console-এ যে প্রপার্টি আছে হুবহু সেটা

function out_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet(e){
  const p = (e && e.parameter) || {};
  if(p.key !== KEY) return out_({success:false, error:'bad key'});
  // ---- গুগল সার্চ রিপোর্ট (Search Console: গত ২৮ দিন) ----
  if(p.report){
    try{
      const tz = 'Asia/Dhaka', DAY = 86400000, now = Date.now();
      const end = Utilities.formatDate(new Date(now - 2 * DAY), tz, 'yyyy-MM-dd');      // Search Console ডেটা ২-৩ দিন পিছিয়ে থাকে
      const start = Utilities.formatDate(new Date(now - 29 * DAY), tz, 'yyyy-MM-dd');
      const api = 'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(SITE_URL) + '/searchAnalytics/query';
      const token = ScriptApp.getOAuthToken();
      const q = function(dims, limit){
        const r = UrlFetchApp.fetch(api, {method:'post', contentType:'application/json', headers:{Authorization:'Bearer ' + token},
          payload: JSON.stringify({startDate:start, endDate:end, dimensions:dims, rowLimit:limit}), muteHttpExceptions:true});
        const code = r.getResponseCode(); let b = {};
        try{ b = JSON.parse(r.getContentText()); }catch(_){}
        if(code !== 200) throw new Error((b.error && b.error.message) || ('HTTP ' + code));
        return (b.rows || []).map(function(x){ return {k:(x.keys||[]).join(' | '), c:x.clicks||0, i:x.impressions||0, ctr:x.ctr||0, pos:x.position||0}; });
      };
      const tot = q([], 1), queries = q(['query'], 100), pages = q(['page'], 50), days = q(['date'], 40);
      return out_({success:true, range:{start:start, end:end}, total:tot[0] || {c:0,i:0,ctr:0,pos:0}, queries:queries, pages:pages, days:days});
    }catch(err){ return out_({success:false, error:String(err && err.message || err).slice(0,200)}); }
  }
  const urls = String(p.urls || '').split('\n').map(function(s){return s.trim();})
    .filter(function(u){ return u.indexOf(SITE_URL) === 0; }).slice(0, 25);
  if(!urls.length) return out_({success:true, results:{}});
  const token = ScriptApp.getOAuthToken();
  const reqs = urls.map(function(u){
    return {
      url: 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect',
      method: 'post', contentType: 'application/json',
      headers: {Authorization: 'Bearer ' + token},
      payload: JSON.stringify({inspectionUrl: u, siteUrl: SITE_URL}),
      muteHttpExceptions: true
    };
  });
  const resp = UrlFetchApp.fetchAll(reqs);
  const results = {};
  for(var i = 0; i < urls.length; i++){
    var code = resp[i].getResponseCode(), body = {};
    try{ body = JSON.parse(resp[i].getContentText()); }catch(_){}
    if(code !== 200){
      results[urls[i]] = {error: (body.error && body.error.message) || ('HTTP ' + code)};
    } else {
      var s = (body.inspectionResult && body.inspectionResult.indexStatusResult) || {};
      results[urls[i]] = {verdict: s.verdict || '', coverage: s.coverageState || ''};
    }
  }
  return out_({success:true, results:results});
}

// একবার এই ফাংশনটা Run করে অনুমতি (Allow) দিন
function authorize(){
  ScriptApp.getOAuthToken();
  UrlFetchApp.fetch('https://searchconsole.googleapis.com/$discovery/rest?version=v1');
}
