var moment = require('moment');
var pg = require('pg');
var QueryStream = require('pg-query-stream');
var transform = require('stream-transform');
var MyError = require('../MyError.js');
var fs = require('fs');
var zlib = require('zlib');

module.exports = {
  process: function(shop, dbconfig, path, cb) {
    var configuration = {
      user: dbconfig.user,
      password: dbconfig.password,
      host: dbconfig.host,
      database: dbconfig.name
    }
    var now = moment().format('YYYYMMDDHHmmSS');
    var pool = new pg.Pool(configuration);

    pool.on('error', function (err) {
      console.error(JSON.stringify(err));
    });

    var sitemap;

    pool.connect(function(err, client, done) {
      if (err) {
        done();
        return cb(new MyError('ERROR', 'process', 'Error', {dbconfig_name: dbconfig.name}, err));
      }
      var query = new QueryStream('SELECT proid FROM product order by procreated desc');
      var stream = client.query(query);
      // release the client when the stream is finished
      stream.on('end', function() {
        done();
        pool.end();
      });
      sitemap = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
      sitemap = sitemap + '<url><loc>https://www.watzdprice.nl/</loc></url>';
      sitemap = sitemap + '<url><loc>https://www.watzdprice.nl/about</loc></url>';
      endSitemap(sitemap, path, 0);
      var c = 0;
      var smc = 1;
      sitemap = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
      var transformer = transform(function (record, cb) {
        c++;
        sitemap = sitemap + '<url><loc>'+'https://www.watzdprice.nl/product/'+record.proid+'</loc></url>';
        if (c%50000===0) {
          endSitemap(sitemap, path, smc++);
          sitemap = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
          return cb();
        } else {
          return cb();
        }
      }, {parallel: 1});
      transformer.on('error',function(err){
          done();
          return cb(new MyError('ERROR', 'process', 'Error', {dbconfig_name: dbconfig.name}, err));
      });
      transformer.on('finish',function(){
        done();
        if (c%50000!==0) {
          endSitemap(sitemap, path, smc++);
        }
        sitemap = '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        for (var i = 0; i < smc; i++) {
          sitemap = sitemap + '<sitemap><loc>https://www.watzdprice.nl/sitemap'+i+'.xml.gz</loc></sitemap>';
        }
        sitemap = sitemap + '</sitemapindex>'
        fs.writeFileSync(path+'sitemap.xml', sitemap);
      });

      stream.pipe(transformer);
    });
  }
}

function endSitemap(sitemap, path, counter) {
  var file = path + 'sitemap'+counter.toString()+'.xml.gz';
  var output = fs.createWriteStream(file);
  var compress = zlib.createGzip();
  compress.pipe(output);
  compress.write(sitemap+'</urlset>');
  compress.end();
}
