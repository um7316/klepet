function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  var jeYouTube = sporocilo.indexOf("<iframe style='width:200px;height:150px;margin-left:20px;' src='https://www.youtube.com/embed/") > -1;
  var jeSlika = sporocilo.indexOf("<img style='width:200px; margin-left:20px;' src=") > -1;
  if (jeSmesko || jeSlika || jeYouTube) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;')
        .replace(/&lt;(img src='http:\/\/sandbox\.lavbic\.net\/teaching\/OIS\/gradivo\/|img style='width:200px; margin-left:20px;' src=)/g, "<$1")
        .replace(/(\.jpg|\.png|\.gif)' \/&gt;/g, "$1' />").replace(/&lt;br \/&gt;/g, "<br />")
        .replace(/&lt;(iframe style='width:200px;height:150px;margin-left:20px;' src='https:\/\/www\.youtube\.com\/embed\/.+' allowfullscreen)&gt;&lt;(\/iframe)&gt;/g,
            "<$1><$2>");
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSlike(sporocilo);
  sporocilo = dodajYouTube(sporocilo);
  sporocilo = dodajSmeske(sporocilo);
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }

  $('#poslji-sporocilo').val('');
}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  $("#vsebina").jrumble();
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  //la
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
    
    $("#seznam-uporabnikov div").click(function() {
      $("#poslji-sporocilo").val("/zasebno \"" + $(this).text() + "\"").focus();
    });
  });
  
  socket.on('dregljaj', function(rezultat) {
    if(rezultat.dregljaj) {
      $("#vsebina").trigger("startRumble");
      setTimeout(function() {
        $("#vsebina").trigger("stopRumble");
      }, 1500);
    }
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}

function dodajSlike(vhodnoBesedilo) {
  var slike = vhodnoBesedilo.match(/\b(http:\/\/|https:\/\/)([^ \t\r\n]+)(\.jpg|\.png|\.gif)\b/gi);
  if(slike != null) {
    vhodnoBesedilo += "<br />";
    for(var s in slike) {
      vhodnoBesedilo += "<img style='width:200px; margin-left:20px;' src='" + slike[s] + "' />";
    }
  }
  
  return vhodnoBesedilo;
}

function dodajYouTube(vhodnoBesedilo) {
  return vhodnoBesedilo.replace(/https:\/\/www\.youtube\.com\/watch\?v=(.+)/g,
      "<iframe style='width:200px;height:150px;margin-left:20px;' src='https://www.youtube.com/embed/$1' allowfullscreen></iframe>");
}
