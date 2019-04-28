//--------------------- CHROME EXTENSION TO READ WEB VISIT HISTORY -------------------------- //

var urlArray = [];
var finalwords = [];
var finalfreq = [];
var saturation = [];
var hue = Math.floor(Math.random() * (359 - 0 + 1)) + 0;

// Link opened in a new tab when clicked
function onAnchorClick(event) {
  chrome.tabs.create({
    selected: true,
    url: event.srcElement.href
  });
  return false;
}

// Given an array of URLs, build a DOM list of those URLs in the index.html
// function showinIndexHtml(divName, data, urlToCount) {
//   var popupDiv = document.getElementById(divName);
//   var ul = document.createElement('ul');
//   //popupDiv.appendChild(ul);
//   for (var i = 0, ie = data.length; i < ie; ++i) {
//     var a = document.createElement('a');
//     a.href = data[i];
//     a.appendChild(document.createTextNode(data[i]));
//     a.addEventListener('click', onAnchorClick);
//     var li = document.createElement('li');
//     li.appendChild(a);
//     ul.appendChild(li);
//   }
// }

// Search history to find links that a user has searched, and show those links in a new tab
function buildTypedUrlList(divName) {
  var microsecondsPerDay = 1000 * 60 * 60 * 24;
  var oneDayAgo = (new Date).getTime() - microsecondsPerDay;
  // Track the number of callbacks from chrome.history.getVisits() that we expect to get.  When it reaches zero, we have all results.
  var numRequestsOutstanding = 0;
  chrome.history.search({
    'text': 'search?q=',              // Return every history item with 'search?q='....
    'startTime': oneDayAgo,  // that was accessed less than one week ago.
    // 'endTime': (new Date).getTime(),
    'maxResults': 10000
  },
  function(historyItems) {
    // For each history item, get details on all visits.
    for (var i = 0; i < historyItems.length; ++i) {
      var url = historyItems[i].url;
      var processVisitsWithUrl = function(url) {
        // We need the url of the visited item to process the visit.
        // Use a closure to bind the url into the callback's args.
        return function(visitItems) {
          processVisits(url, visitItems);
        };
      };
      chrome.history.getVisits({url: url}, processVisitsWithUrl(url));
      numRequestsOutstanding++;
    }
    if (!numRequestsOutstanding) {
      onAllVisitsProcessed();
    }
  });

  // Maps URLs to a count of the number of times the user typed that URL into the omnibox.
  var urlToCount = {};
  // Callback for chrome.history.getVisits().  Counts the number of times a user visited a URL
  var processVisits = function(url, visitItems) {
    for (var i = 0; i < visitItems.length; ++i) {
      if (!urlToCount[url]) {
        urlToCount[url] = 0;
      }
      urlToCount[url]++;
    }
    // If this is the final outstanding call to processVisits(), then we have the final results.  Use them to build the list of URLs to show in index.html
    if (!--numRequestsOutstanding) {
      onAllVisitsProcessed();
    }
  };

  var onAllVisitsProcessed = function() {
    // Get the top scorring urls.
    urlArray = [];
    for (var url in urlToCount) {
      urlArray.push(url);
    }

    // showinIndexHtml(divName, urlArray);

    extractWordsFromUrls();
  };
}

document.addEventListener('DOMContentLoaded', function () {
  buildTypedUrlList("url_div");
});



//--------------------- EXTRACT SEARCHED WORDS FROM URLS -------------------------- //
var finalstring = [];
function extractWordsFromUrls() {

  console.log("ready");
  console.log("urlarray length: " + urlArray.length);

  //extracting words
  for (var i=0;i<urlArray.length;i++){
    var startingpoint, endpoint;

    startingpoint=urlArray[i].search("q=");

    if (urlArray[i].search("&source=") != -1){
      endpoint = urlArray[i].search("&source=");
    }
    else if (urlArray[i].search("&spell=") != -1){
      endpoint = urlArray[i].search("&spell=");
    }
    else if (urlArray[i].search("&sa") != -1){
      endpoint = urlArray[i].search("&sa");
    }
    else  {
      endpoint = urlArray[i].search("&oq=");
    }

    if (startingpoint == -1 || endpoint == -1 ){
      urlArray.splice(i,1);
    }

    console.log("startingpoint:" + startingpoint);
    console.log("endpoint: " + endpoint);

    var newstring = urlArray[i].substring(startingpoint+2,endpoint);
    console.log("newstring:" + newstring);

    finalstring = finalstring.concat(newstring.split("+"));

  }

  //sorting
  var cnts = finalstring.reduce( function (obj, val) {
    obj[val] = (obj[val] || 0) + 1;

    console.log(val + ": " + obj[val]);
    return obj;
  }, {} );

  // var sorted = Object.keys(cnts).sort( function(a,b) {
  //   return cnts[b] - cnts[a];
  // });

  // console.log("sorted: " + sorted);
  // console.log("value:" +  finalstring );
  // console.log("keys: " + Object.keys(cnts));
  console.log("values: " + Object.values(cnts));

  finalwords = Object.keys(cnts);
  finalfreq = Object.values(cnts);

  //var reducer = (accumulator, currentValue) => accumulator + currentValue;
  var sum=0;

  for (var i=0; i<finalfreq.length;i++){
    sum += finalfreq[i];
  }
  console.log("final sum: " + sum);

  for(var i=0; i<finalfreq.length;i++){
    finalfreq[i] = finalfreq[i] * 100 / sum;
    console.log("%: " + finalfreq[i]);
  }

  //console.log("0th index: " + finalwords[0]);
  //console.log("0th index freq: " + finalfreq[0]);

  makeWordCloud();
}




//-------------------------------- MAKE WORDCLOUD -------------------------------------- //
function makeWordCloud() {
  //setup
  var config = {
    spiralResolution: 1, //Lower = better resolution
    spiralLimit: 360 * 5,
    lineHeight: 0.8,
    xWordPadding: 0,
    yWordPadding: 2,
    font: "sans-serif"
  }

  var cloud = document.getElementById("word-cloud");
  //console.log("wordcloud: " + cloud);
  cloud.style.position = "relative";
  cloud.style.fontFamily = config.font;

  console.log("width: " + cloud.offsetWidth);
  console.log("height: " + cloud.offsetHeight);

  var startPoint = {
    x: cloud.offsetWidth / 4,
    y: cloud.offsetHeight / 2
  };

  var wordsDown = [];

  //placement function
  function createWordObject(word, freq, sat) {
    //console.log("currently creating: " + word);
    var wordContainer = document.createElement("div");
    wordContainer.style.position = "absolute";
    wordContainer.style.fontFamily = "HelveticaNeue-CondensedBold"

    var colorC = "hsl(" + hue + ",100%," + sat + "%)";
    wordContainer.style.color = colorC;
    //console.log("COLOR: " + colorC);

    wordContainer.style.fontSize = freq + "vw";

    if (freq < 1){
      wordContainer.style.fontSize = "1.1vw";
    }

    if (freq > 10) {
      wordContainer.style.fontSize = "10vw";
    }

    wordContainer.style.lineHeight = config.lineHeight;
    /*    wordContainer.style.transform = "translateX(-50%) translateY(-50%)";*/
    wordContainer.appendChild(document.createTextNode(word));

    return wordContainer;
  }

  function placeWord(word, x, y) {

    cloud.appendChild(word);
    // word.style.left = x - word.offsetWidth/2 + "px";
    // word.style.top = y - word.offsetHeight/2 + "px";

    wordsDown.push(word.getBoundingClientRect());
  }

  function spiral(i, callback) {
    angle = config.spiralResolution * i * 1.5;
    x = (1 + angle) * Math.cos(angle);
    y = (1 + angle) * Math.sin(angle);
    return callback ? callback() : null;
  }

  function intersect(word, x, y) {
    cloud.appendChild(word);

    word.style.left = x + word.offsetWidth/2 + "px";
    word.style.top = y - word.offsetHeight/2 + "px";

    var currentWord = word.getBoundingClientRect();

    cloud.removeChild(word);

    for(var i = 0; i < wordsDown.length; i+=1){
      var comparisonWord = wordsDown[i];

      if(!(currentWord.right + config.xWordPadding < comparisonWord.left - config.xWordPadding ||
        currentWord.left - config.xWordPadding > comparisonWord.right + config.wXordPadding ||
        currentWord.bottom + config.yWordPadding < comparisonWord.top - config.yWordPadding ||
        currentWord.top - config.yWordPadding > comparisonWord.bottom + config.yWordPadding)){

          return true;
        }
      }

      return false;
    }

    //create word cloud
    (function placeWords() {
      for (var i = 0; i < finalwords.length; i += 1) {

        saturation[i] = Math.floor(Math.random() * (100 - 20 + 1)) + 20;
        //console.log("saturation test: " + saturation[i]);

        var word = createWordObject(finalwords[i], finalfreq[i], saturation[i]);

        for (var j = 0; j < config.spiralLimit; j++) {
          //If the spiral function returns true, we've placed the word down and can break from the j loop
          if (spiral(j, function() {
            if(j%2 ==0){
              if (!intersect(word, startPoint.x + x, startPoint.y + y)){
                placeWord(word, startPoint.x + x, startPoint.y + y);
                return true;
              }
            }
            else{
              if(!intersect(word, startPoint.x - x, startPoint.y + y)){
                placeWord(word, startPoint.x - x, startPoint.y + y);
                return true;
              }
            }
          })) {
            break;
          }
        }
      }
    })();
  }
