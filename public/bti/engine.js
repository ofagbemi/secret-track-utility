/* ----- ==== ### * ************* ==== ----- */
/*                                           */
/*  because the internet  --  script driver  */
/*                                           */
/* ----- ************ ************ *** ----- */
  
// App Globals -----------------------------
// Change these to tweak app settings

window.sizingCutoffs = {
	// Different modes for the mobile view
	mobile: 500,
	twoPage: 800,
	max: 1120,

	// Content area height estimation for mobile
	heightScale: 0.75,
	heightScaleMobile: 0.8,
	heightScaleScroll: 1.1,
	heightScaleScrollTablet: 0.9,

	// Page aspect ratio for desktop
	scrollPageAspect: 1.294117,
	scrollPagePadding: 20
}

window.timing = {
	animDelayThreshold: 540,
	animTime: 400,
	animExtra: 80
}

window.animation = {
	shadingOpacity: 0.25
}

// App Startup Routine ---------------------
// Creates script and page managers
// Handles setting and loading permalinks

$(function(){

	// Figure out what we're dealing with
	var mobile = ( $("body").width() <= sizingCutoffs.mobile );
	var twopage = ( $("body").width() <= sizingCutoffs.twoPage );
	var touchDevice = ('ontouchstart' in document.documentElement || window.location.hash.indexOf("book")!=-1);

	// URL Changing
 	var updateURL = function(page,span){
 		if(mobile){
			window.location.hash = span + "/page/" + page;
		}
	}

	if(touchDevice){
		$(".player_resetbutton").css("display","none");
		//window.sizingCutoffs.heightScaleScroll = window.sizingCutoffs.heightScaleScroll
	}

	// Load script and initial pages
	$("#status p").html("Downloading Script");
	$.ajax("./res/bti.html").done(function(script){
		// Set up the script manager
		$("#status p").html("Calibrating Renderer");
		setTimeout(function(){
			
			// Start Page Manager
			if(touchDevice && mobile){

				// Create the script manager
				if(mobile)window.sizingCutoffs.heightScale = window.sizingCutoffs.heightScaleMobile;
				var width = $("#book .contentarea").width()*((twopage)?2:1);
				window.script = new scriptManager2(script,width,window.innerHeight*window.sizingCutoffs.heightScale,true);
				$("#status").remove();

				// Create the page manager and set it up for gestures
				window.dom = new touchPageManager(window.script,updateURL);
				if('ontouchstart' in document.documentElement)window.dom.addTouchEvents();
			}else{

				// Create the script manager
				var height = 800 * window.sizingCutoffs.heightScaleScroll;
				window.script = new scriptManager2(script,800,height,touchDevice);
				$("#status").remove();

				// Create the page manager
				window.dom = new desktopPageManager(window.script,updateURL);
				var height = $("#bookinternal").width() * window.sizingCutoffs.heightScaleScroll;
				window.dom.resize($("#bookinternal").width(),height,false);
			}

			// Get the right page
			if(window.location.hash.length > 1){
				var span = parseInt(window.location.hash.split("/")[0].slice(1));
				window.dom.goToSpan(span);
			}else{
				window.dom.goToPage(1);
			}

		},10);
	});

	$(window).resize(function(){

		// Resize the pages		
		if(touchDevice){
			var ca = $("#book .contentarea");
			window.dom.resize(ca.width(),window.innerHeight*window.sizingCutoffs.heightScale,mobile);
		}else{
			var height = $("#bookinternal").width() * window.sizingCutoffs.heightScaleScroll;
			window.dom.resize($("#bookinternal").width(),height,false);
		}

		setTimeout(function(){
			if(window.script.calibration == []){
				location.reload();
			}
		},1000);

		// Go back to the span the user was looking at before
		window.dom.goToSpan(parseInt(window.location.hash.slice(1)));

	});

	// Animation Support on older browsers
	if (!$.support.transition)
 		$.fn.transition = $.fn.animate;

});

// Desktop Page Manager ------------------------
// Handles a scrolling autoloading page layout

function desktopPageManager(scriptManager, onPageChange){
	// VARIABLES
	var s = scriptManager;
	var $this = this;
	this.callback = onPageChange;

	// BOOTSTRAP
	var book = $("#book");
	book.html(""); // Clear existing pages
	book.addClass("scroller"); // Make scrollable
	var pc = $("<div id='bookinternal'></div>");
	book.append(pc);
	$(".arrow").css("display","none"); // Hide arrows

	// Script Sizing Calibration Overrides
	s.calibration.video.base = 430;

	// STATE
	this.maxPage = 0;
	this.pageInnerHeight = pc.width() * window.sizingCutoffs.scrollPageAspect;
	this.pageOuterHeight = this.pageInnerHeight + window.sizingCutoffs.scrollPagePadding;
	this.triggeredScroll = false;

	// Use the HTML template to generate the next page
	this.createPage = function(number){
		return $this.pageGenerator(s.getPage(number));
	}

	// Runs the templating engine
	this.pageGenerator = function(content){
		// Generate the data for the template
		var data = {
			content: (content!==undefined)?content:"",
			num: s.currentPage+1,
			span: (s.currentPage<1)?0:s.cacheSpanID[s.currentPage-1],
			height: $this.pageInnerHeight+"px"
		}

		// Create the page
		if(s.finished)return;
		var dom = applyTemplate("tmpl-pagescroll",data);
		mediaExpander(dom,false,false);
		return dom;
	}

	// PAGE MANAGER API
	this.goToPage = function(page){
		if(page > $this.maxPage){
			// Create each new page
			for(; $this.maxPage <= page; $this.maxPage++){
				pc.append(this.createPage($this.maxPage));
			}
		}

		$this.triggeredScroll = true;
		window.scrollTo(0,(page-1)*$this.pageOuterHeight);
	}

	this.goToSpan = function(spanID){
		// Get the page for the span
		var ct = (spanID==0)?-1:s.getSpan(spanID);
		$this.goToPage(s.currentPage+2);
	}

	this.next = function(){$this.goToPage($this.maxPage+1);}
	this.previous = function(){$this.goToPage($this.maxPage-1);}

	this.resize = function(newWidth, newHeight, disableGrouping){
		$this.pageInnerHeight = newWidth * window.sizingCutoffs.scrollPageAspect;
		$this.pageOuterHeight = this.pageInnerHeight + window.sizingCutoffs.scrollPagePadding;

		s.resize(newWidth,newHeight,disableGrouping);
		pc.html(""); // Clear all pages
		$this.maxPage = 0;
	}

	this.addTouchEvents = function(){ console.log("Desktop does not support touch events"); }

	// SCROLL SPY
	$(window).scroll(function(){
		var amt = $(window).scrollTop();
		var total = pc.height();

		// Create new pages where necessary
		if(total - amt < $this.pageOuterHeight*2){
			if(!s.finished)pc.append($this.createPage($this.maxPage++));
		}

		// Stop here if the scroll was intentional
		if($this.triggeredScroll){
			$this.triggeredScroll = false;
			return;
		}

		// Update the page URL
		var pgoffset = 200;
		var num = Math.ceil((amt+pgoffset)/$this.pageOuterHeight);
		var pg = $("div[num='"+num+"']");
		$this.callback(num,pg.attr("spanstart"));
	});

}

// Touch Page Manager ----------------------
// Handles single and double page layouts
// Runs animations when appropriate

function touchPageManager(scriptManager, onPageChange){

	// VARIABLES
	var s = scriptManager;
	var $this = this;
	this.callback = onPageChange;

	// STATE
	this.doublePage = ( $("body").width() > sizingCutoffs.twoPage );
	this.canChange = true;
	this.lastTrigger = 0;

	// BOOTSTRAP
	if(!this.doublePage)$("#mainpages").addClass("single");

	// Hacky way to prevent a whole manner of obscure bugs
	setInterval(function(){
		if($(".pagetable").length == 0 || $(".pagetable").length > 2){
			location.reload();
		}
	},1000);

	// HELPER FUNCTIONS
	// Use the HTML template to generate the next page
	this.createNextPage = function(isLeftPage){
		return $this.pageGenerator(s.nextPage(),isLeftPage);
	}

	// Runs the templating engine
	this.pageGenerator = function(content,isLeftPage){
		// Generate the data for the template
		var data = {
			content: (content!==undefined)?content:"",
			num: s.currentPage+1
		}

		// Control arrows
		if(s.finished){
			$(".arrow.next").css("opacity",0.15);
		}else{
			$(".arrow.next").removeAttr("style");
		}

		// Create the page
		var dom = applyTemplate((isLeftPage)?"tmpl-pageleft":"tmpl-pageright",data);
		mediaExpander(dom,true,true);
		return dom;
	}

	// PAGE MANAGER API
	this.goToPage = function(page){
		if(!$this.canChange)return;
		// Set the current page to the requested one
		s.currentPage = page-2;

		// Clear existing pages
		$("#mainpages tr").html("");

		// Run the callback with the new page
		$this.lastTrigger = new Date().getTime();
		$this.callback(s.currentPage+2,Math.max(s.currentSpan,0));

		// Render the pages
		$("#mainpages tr").append($this.createNextPage(true));
		if($this.doublePage)$("#mainpages tr").append($this.createNextPage(false));
	}
	this.goToSpan = function(spanID){
		if(!$this.canChange)return;
		// Get the page for the span
		var ct = s.getSpan(spanID);

		// Clear existing pages
		$("#mainpages tr").html("");

		// Run the callback with the new page
		$this.callback(s.currentPage+2,spanID);

		// If there's only one page, render it
		if(!$this.doublePage)return $("#mainpages tr").append($this.pageGenerator(ct,true));

		// Otherwise, figure out which side the span goes on and put it there
		if(s.currentPage % 2 == 0){
			$("#mainpages tr").append($this.pageGenerator(ct,true));
			$("#mainpages tr").append($this.createNextPage(false));
		}else{
			s.currentPage -= 2;
			$("#mainpages tr").append($this.createNextPage(true));
			$("#mainpages tr").append($this.createNextPage(false));
		}
	}

	this.next = function(animated,setupAnimationDOM){
		if(!$this.canChange)return false;
		// Don't go beyond the last page
		if(s.finished)return false;

		// Only animate if the delay is long enough
		if(animated===undefined)animated=true;
		animated = animated && ((new Date().getTime() - $this.lastTrigger) > window.timing.animDelayThreshold);

		// Setup animation DOM
		if(animated || setupAnimationDOM){
			var topPages = $("#mainpages").clone();
			topPages.attr("id","outpages").addClass("top");
			$("#pagecontainer").append(topPages);
			$("#shading").attr("style","opacity:"+window.animation.shadingOpacity);
		}

		// Change the page
		s.currentSpan++;
		$this.goToPage(s.currentPage+2);

		// Run Animation
		if(animated){
			$this.canChange = false;
			$("#outpages").transition({
				x: -($("#outpages").width()+20)
			},window.timing.animTime,"easeInSine");

			$("#shading").transition({
				opacity: 0
			},window.timing.animTime*1.2,"easeOutQuad");

			setTimeout(function(){
				$("#outpages").remove();
				$("#shading").attr("style","display:none;");
				$this.canChange = true;
			},window.timing.animTime+window.timing.animExtra);
		}

		return true;
	}
	this.previous = function(animated,setupAnimationDOM){
		if(!$this.canChange)return false;
		// Don't go beyond the first page
		if(s.currentPage < (($this.doublePage)?2:1))return false;

		// Only animate if the delay is long enough
		if(animated===undefined)animated=true;
		animated = animated && ((new Date().getTime() - $this.lastTrigger) > window.timing.animDelayThreshold);

		// Setup animation DOM
		if(animated || setupAnimationDOM){
			var underpages = $("#mainpages").clone();
			underpages.attr("id","underpages");
			$("#pagecontainer").append(underpages);
			$("#shading").attr("style","opacity:0;");
			$("#mainpages").addClass("top");
		}

		// Change the page
		s.currentSpan = (s.currentPage-(($this.doublePage)?4:2) >= 0)?s.cacheSpanID[s.currentPage-(($this.doublePage)?4:2)]+1:0;
		$this.goToPage(s.currentPage-(($this.doublePage)?2:0));

		// Run Animation
		if(animated){
			$this.canChange = false;

			$("#mainpages")
				.transition({x: -($("#underpages").width()+20)},0)
				.transition({x: 0},window.timing.animTime,"easeOutSine")

			$("#shading").transition({
				opacity: window.animation.shadingOpacity
			},window.timing.animTime*1.2,"easeOutQuad");

			setTimeout(function(){
				$("#underpages").remove();
				$("#mainpages").removeClass("top");
				$("#shading").attr("style","display:none;");
				$this.canChange = true;
			},window.timing.animTime+window.timing.animExtra);
		}

		return true;
	}

	this.resize = function(newWidth,newHeight,disableGrouping){

		// Resize the script
		s.resize(newWidth,newHeight,disableGrouping);

		// Should be a two page layout?
		var sbs = ( $("body").width() > sizingCutoffs.twoPage );

		// Convert to double page
		if( sbs && !$this.doublePage ){
			$("#mainpages").removeClass("single");

		// Convert to single page
		}else if( !sbs && $this.doublePage ){
			$("#mainpages").addClass("single");
		}

		$this.doublePage = sbs;
	}

	this.addTouchEvents = function(){

		// Add a special div to capture the touch events
		$("#content").append($("<div id='touchDiv'></div>"));

		// Finger sliding variables
		var touchStart = [];
		var touchOn = false;
		var state = 1;
		var diff = [];

		// Stores currently in use pages
		var transitionPages = [];
		var otherPages = [];

		// Timing
		var elapsed = 0;

		// Start gesture
		$("#touchDiv").bind("touchstart",function(e){

			// Get the touch location
			var t = e.originalEvent.touches;
			touchStart = [(t)?t[0].screenX:e.screenX,(t)?t[0].screenY:e.screenY];

			// Passthrough for relevant controls
			var end = false;
			$.each($(".player,.video a"),function(i,o){
				if(end)return;
				console.log(o);

				// Get the object's coordinates
				var offset = $(o).offset();
				var posY = offset.top - $(window).scrollTop();
				var posX = offset.left - $(window).scrollLeft(); 
				var height = $(o).height();
				var width = $(o).width();

				// See if we have a hit
				var wiggle = 10;
				if(touchStart[0] - wiggle >= posX && touchStart[1] - wiggle >= posY ){
					console.log("Below TL");
					if(touchStart[0] + wiggle <= posX+width && touchStart[1] + wiggle <= posY+height ){
						console.log("Above BR");
						if($(o).hasClass("player")){
							$(".player_playbutton",o).click();
						}else{
							$(o).click();
						}
						end = true;
					}
				}
			});
			if(end){
				touchOn = false;
				return;
			}

			// Clean up improperly closed events
			if(touchOn){
				finishGesture(e,"true");
			}

			// Start a new gesture
			state = 1;
			touchOn = true;
			elapsed = new Date().getTime();
		});

		// Move gesture
		$("#touchDiv").bind("touchmove",function(e){
			if(!$this.canChange)return;
			e.preventDefault();
			if(!touchOn)return;

			// Get touch differential
			e = e.originalEvent;
			var t = e.touches;
			var touchLocation = [(t)?t[0].screenX:e.screenX,(t)?t[0].screenY:e.screenY];
			if(touchStart.length == 0)return touchStart = touchLocation;
			diff = [touchLocation[0]-touchStart[0],touchStart[1]-touchLocation[1]];

			// SETUP STATE TRANSITION
			// Next Page
			if(diff[0] < 0 && state == 1){
				state = 2;
				if(!$this.next(false,true))return cancelGesture();
				transitionPages = $("#outpages");
				otherPages = $("#mainpages");
				$("#shading").removeAttr("style")
			}

			// Previous Page
			if(diff[0] > 0 && state == 1){
				state = 0;
				if(!$this.previous(false,true))return cancelGesture();
				transitionPages = $("#mainpages");
				otherPages = $("#underpages");
				$("#shading").removeAttr("style")
			}

			// RESPOND TO MOTION
			if(state == 2){
				transitionPages.transition({x: Math.min(diff[0],0)},0);
				$("#shading").css("opacity", 0.4-(Math.abs(diff[0])/(transitionPages.width()*3)));
			}else if(state == 0){
				transitionPages.transition({x: Math.min(-(transitionPages.width())+diff[0]*2,0)},0);
				$("#shading").css("opacity", (Math.abs(diff[0])/(transitionPages.width()*2)));
			}

		});

		// Cancel Gesture
		function cancelGesture(){
			touchOn = false;
			touchStart = [];
			if(state == 2){
				transitionPages.transition({x: 0},200,"easeOutQuad");
				$this.canChange = false;
				setTimeout(function(){
					$("#shading").css("display","none");
					s.currentPage--;
					transitionPages.removeClass("top").attr("id","mainpages");
					otherPages.remove();
					$this.canChange = true;
				},500);
			}else if(state == 0){
				transitionPages.transition({x: -(transitionPages.width())},200,"easeOutQuad");
				$("#shading").transition({opacity: 0},350);
				$this.canChange = false;
				setTimeout(function(){
					$("#shading").css("display","none");
					s.currentPage++;
					transitionPages.remove();
					otherPages.attr("id","mainpages");
					$this.canChange = true;
				},300);
			}
			state = 1;
		}

		// Finish gesture
		function finishGesture(e,preventTap){
			if(!touchOn)return;
			e.preventDefault();

			// Cancel action
			elapsed = new Date().getTime() - elapsed;
			if(state != 1 && Math.abs(diff[0])<50 && elapsed>300){
				return cancelGesture();
			}

			// Complete action
			if(preventTap != "true" && state == 1 && $this.canChange){
				var width = $("#book").width();
				if(touchStart[0] > width/2){
					$this.next();
				}else{
					$this.previous();
				}

			}else if(state == 2){
				transitionPages.transition({x:-(transitionPages.width())},350,'easeInSine');
				$("#shading").transition({opacity: 0},350);
				$this.canChange = false;
				setTimeout(function(){
					$("#shading").css("display","none");
					transitionPages.remove();
					$this.canChange = true;
				},500);
			}else if(state == 0){
				transitionPages.transition({x:0},350,'easeInSine');
				$("#shading").transition({opacity: 0.4},350);
				$this.canChange = false;
				setTimeout(function(){
					$("#shading").css("display","none");
					transitionPages.removeClass("top");
					otherPages.remove();
					$this.canChange = true;
				},500);
			}
		}

		touchOn = false;
		touchStart = [];
		$("#touchDiv").bind("touchend",finishGesture);
	}

	// CONTROLS

	// Directional Buttons
	$(".arrow.next").bind("click",$this.next);
	$(".arrow.prev").bind("click",$this.previous);

	// Popup
	$("body").delegate(".popupOuter","touchstart click",function(){
		$(".popupOuter").remove();
	});

	// Arrow Key Controls
	document.onkeydown = function(e){
		if(e.keyCode == 37){ // Left
			$this.previous();
		}else if(e.keyCode == 39){ // Right
			$this.next();
		}
	}
}

// Media Expansion Layer ---------------------
// We call him Mel
// Generates music players and embed codes
// For mobile and desktop

function mediaExpander(pageDOM,mobile,popoutVideo){

	// Add audio embeds
	$.each($(".track",pageDOM),function(index,object){
		var o = $(object);
		o.html($(generatePlayer(o.attr("aud-id"),o.attr("aud-title"),o.attr("aud-ref"),o.attr("aud-length"))));
		setTimeout(function(){
			if(o.attr("aud-disable")=="true"){$(".player",o).addClass("disabled");}
		},10);
	});

	// Add video embeds
	$.each($(".video",pageDOM),function(index,object){
		if(!mobile)$(object).html($('<iframe src="http://player.vimeo.com/video/'+$(object).attr("vimeo-desktop")+'?title=0&amp;byline=0&amp;portrait=0" width="500" height="500" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>'));
		else{$(object).html($('<a href="#" onclick="showVideoMobile('+$(object).attr("vimeo-desktop")+')">Show Video</a>'));}

		// Add event listeners
		setTimeout(function(){
			vimeo($("iframe",object), 'addEventListener', 'finish');
			vimeo($("iframe",object), 'addEventListener', 'pause');
			vimeo($("iframe",object), 'addEventListener', 'play');
		},300);
	});
	
	// Recieve vimeo player events
	window.addEventListener('message', function(e){
		var data = JSON.parse(e.data);

		// Remove the popup when the video finishes on mobile
		if(data.event == "finish"){
			if(mobile){ 
				$(".popupOuter").remove(); 
				if(window.audioObjectPlaying){
					window.audioObjectPlaying.play();
				}
			}
		}

	}, false);
}

// Function to determine if videos are on the screen at all
function elementOnScreen(elem){

    var docViewTop = $(window).scrollTop();
    var docViewBottom = docViewTop + $(window).height();

    var elemTop = $(elem).offset().top;
    var elemBottom = elemTop + $(elem).height();

    return ((elemBottom >= docViewTop)    && (elemTop <= docViewBottom));
    //    &&  (elemBottom <= docViewBottom) && (elemTop >= docViewTop   ));
}

// Autoplay after 1 second of being in view
// Check for videos in view every second
if( !('ontouchstart' in document.documentElement || window.location.hash.indexOf("book")!=-1) ){
	setInterval(function(){
		$.each($("iframe"),function(index,object){
			if($(object).attr("autoplay-stage")=="waiting")return;
			if($(object).parent().attr("vimeo-autoplay")=="false")return;

			// For each video element that's currently on the screen
			if(elementOnScreen($(object))){
				if($(object).attr("autoplay-stage")=="playing")return;
				$(object).attr("autoplay-stage","waiting");

				// Let's see if it's still on the screen in two seconds
				setTimeout(function(){
					if(elementOnScreen($(object))){
						// It is!
						$(object).attr("autoplay-stage","playing");
						vimeo($(object),'play');

						// If video has audio
						if($(object).parent().attr("vimeo-audio")=="true"){
							if(window.audioObjectPlaying !== undefined){
								window.audioObjectPlaying.stop();
							}
						}
					}else{
						// It wasn't
						vimeo($(object),'pause');
						$(object).attr("autoplay-stage","none");
					}
				},1000);
			}else{
				if($(object).attr("autoplay-stage")=="playing"){
					vimeo($(object),'pause');
					$(object).attr("autoplay-stage","paused");
				}
			}
		});
	},1000);
}

// Special function sends messages into the Vimeo player iFrame
function vimeo(object, action, value) {
	if(object[0] == undefined || object[0].contentWindow == undefined)return;
    var data = { method: action }; 
    if (value) { data.value = value;}
    var url = object.attr('src').split('?')[0];
    object[0].contentWindow.postMessage(JSON.stringify(data), url);
}

function showVideoMobile(id){
	var topOuter = $("<div class='popupOuter'></div>");
	var top = $("<div class='popup'></div>");
	top.append($('<iframe src="http://player.vimeo.com/video/'+id+'?title=0&amp;byline=0&amp;portrait=0&amp;autoplay=1" width="320" height="320" frameborder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>'));
	topOuter.append(top);
	$("#content").append(topOuter);
}

// Script Manager 2.0 ---------------------------------------
// Formats the script for the proper page width
// Calibrates itself to the browser to estimate item height
// Makes page reflow ~100x faster than the old version
// Includes an HTML preprocessor that might be cut out later

function scriptManager2(script,width,height,disableGrouping){
	// Fix JS variable scoping
	var $this = this;

	// Store script components
	this.spans = [];
	this.lines = [];

	// Page cache
	this.cacheWidth = width;
	this.cacheHeight = height;
	this.cache = [];
	this.cacheSpanID = [];

	// Normally tries to group related clauses together
	// This is disabled on Mobile due to size constraints
	// Furthermore, when this flag is set, another system
	// divides each span into individual lines, for even
	// better small-size text reflow
	this.cacheDisableGrouping = disableGrouping;

	// Current page cache ending state
	this.cacheEndPage = -1;
	this.cacheEndSpan = -1;
	this.cacheEndWord = -1;
	this.cacheFinished = false;

	// Current View State
	this.currentPage = -1;
	this.currentSpan = -1;
	this.finished = false;

	// Preprocess script file to break it into independent components
	this.preprocess = function(scriptDOM){
		var accHTML = ""; var accLine = {};
		$.each(scriptDOM,function(index,object){
			// Only accept p objects, not plaintext or comments
			if(!$(object).is("div"))return;

			// Close off the previous accumulator if the new object wants to go solo
			if(object.className == "solo"){
				$this.spans.push(accHTML);
				$this.lines.push(accLine);
				accHTML = ""; accLine = {};
			}

			// Add the object to the accumulator
			var txt = ("innerText" in object)?object.innerText:object.textContent;
			accLine[object.className] = txt;
			accHTML += object.outerHTML;

			// If the object is not a special type, add it directly
			if($this.cacheDisableGrouping || (object.className != "speaker" && object.className != "delivery" && object.className != "location" && object.className != "track" && object.className != "tracknote")){
				$this.spans.push(accHTML);
				$this.lines.push(accLine);
				accHTML = ""; accLine = {};
			}

		});
	}
	timer("Preprocessing script",function(){$this.preprocess($(script))});

	// Calibrates the font rendering for accurate width/height predictions
	this.calibrationSelector = "#measure-page";
	this.calibrationTypes = ["location","speaker","dialogue","delivery","description","newline"];
	this.calibration = [];

	// Calibrate all elements
	this.initialCalibration = function(){
		$.each($this.calibrationTypes,function(index,type){
			$this.calibration[type] = $this.calibrateType(type,$this.cacheWidth);
		});
	}

	// Calibrate just one element and extrapolate the difference
	this.recalibrate = function(){
		// Find the difference in charachters per line
		var ogc = this.calibration["location"];
		var nc = $this.calibrateType("location",$this.cacheWidth);
		var delta = nc.cpl - ogc.cpl;

		// Extend this difference to all of the types
		for(var i in $this.calibration){$this.calibration[i].cpl += delta;}
	}

	// Actual calibration routine
	this.calibrateType = function(type,width){

		// Add the element to the calibration DOM and resize it
		var parent = $($this.calibrationSelector);
		parent.css("width",width+"px");
		var jqo = $("p#calibrationBlock",parent);
		jqo.attr("class",type);
		var jqbase = $("p#blankHeight",parent).attr("class",type);

		// Calibration locals
		var lines = 1;
		var lastHeight = 0;
		var lastCharacter = 0;
		var heights = [];
		var characters = [];
		var index = 1;

		// Gather sample by adding random characters
		$.each($("span",jqo),function(index,object){
			// Add a random character
			var height = $(object).height()+$(object).position().top;

			// Text has wrapped to next line
			if(height > lastHeight){
				var lastBreak = (characters.length > 0)?characters[characters.length-1]:0;
				characters.push(index-lastBreak);
				heights.push(height);
				lastHeight = height;
				lines++;
			}

			// Increase the index
			index++;
		});

		// Process sample
		var avglh = heights[1]-heights[0];
		var avgchars = (characters[2]+characters[1])/2;
		return {
			line: avglh,
			base: jqbase.outerHeight(true),
			cpl: characters[1]
		}
	}
	timer("Calibrating for text renderer",function(){$this.initialCalibration();});

	// Manual calibration additions
	$this.calibration["track"] = {
		line: 0, cpl: 1000,
		base: 100
	};
	$this.calibration["video"] = {
		line: 0, cpl: 1000,
		base: 60
	};

	// Estimate the height of a span at the given width
	this.spanHeight = function(spanlines){
		var acc = 0;
		if(spanlines==undefined)return;
		$.each(spanlines,function(type,line){
			if(line == undefined)return;
			var chars = line.length;

			// Run calibration for uncallibrated types
			if(!(type in $this.calibration)){
				$this.calibration[type] = $this.calibrateType(type);
			}

			// Estimate height
			var calibration = $this.calibration[type];
			acc+=calibration.base;

			// Estimate number of lines
			if(chars < calibration.cpl){
				// Text only takes up one line, no need to consider wrapping
				acc += calibration.line;
			}else{
				// Text is multiple lines, estimate word wrapping
				var words = line.split(" ");
				var wc = 0;
				var lines = 1;
				acc += calibration.line;

				// Go through each word and text the length
				for(var i = 0; i < words.length; i++){
					wc += words[i].length+1;
					if(wc > calibration.cpl){
						lines++;
						acc += calibration.line;
						wc = words[i].length;
					}
				}
			}
		});
		return acc;
	}

	// Crops a single-item span to be a specific height
	// (This may be expanded to work with multi-item spans
	// in the future but it doesn't seem necessary)
	this.spanCrop = function(type,text,desiredHeight){
		if(text == undefined || type == undefined || desiredHeight == undefined)return;

		// Run calibration for uncallibrated types
		if(!(type in $this.calibration)){
			$this.calibration[type] = $this.calibrateType(type);
		}
		var calibration = $this.calibration[type];

		// Local variables
		var words = text.split(" "); var wc = 0;
		var acc = calibration.base + calibration.line;
		if(acc > desiredHeight)return "";

		// Go through each word and check the length
		for(var i = 0; i < words.length; i++){
			wc += words[i].length+1;
			if(wc > calibration.cpl){
				acc += calibration.line;
				if(acc > desiredHeight)return words.slice(0,i).join(" ");
				wc = words[i].length;
			}
		}

		// Whoa, the whole thing fits
		// (that's what she said)
		return text;
	}

	// Page generation
	this.generateNextPage = function(){
		var ch = 0; var acc = ""; var first = true;
		if($this.cacheEndSpan >= $this.spans.length)return false;
		$this.cacheFinished = true;
		for(var i = $this.cacheEndSpan+1; i < $this.spans.length; i++){

			// Get span height
			var spanheight = $this.spanHeight($this.lines[i]);
			var spanct = $this.spans[i];

			// Detect solo pages
			if("solo" in $this.lines[i] || "solo track" in $this.lines[i]){
				// If this is the first element on the page, add it in
				if(first){
					acc += $this.spans[i];
					$this.cacheEndSpan++;
				}

				// Make sure the code doesn't accept anything more
				spanheight = $this.cacheHeight;

			// Other special cases for the beginning
			}else if(first){

				// Crop the first line if necessary
				if($this.cacheEndWord != -1){
					var cropped = ""; var type = "";
					for(var key in $this.lines[i]){
						type = key;
						cropped = $this.lines[i][key].slice($this.cacheEndWord);	
					}
					if(cropped!=""){
						spanct = spanct.replace(/>.*?<\/div/,">"+cropped+"</div");
						var tmplines = {}; tmplines[type] = cropped;
						spanheight = $this.spanHeight(tmplines);
						$this.cacheEndWord = -1;
					}
				}

				// Remove any newlines, we don't care about them at the beginning
				// while("newline" in $this.lines[i]){i++;}
			}

			// If span fits
			if(ch + spanheight < $this.cacheHeight){
				acc += "<!-- "+spanheight+"px -->"+spanct;
				ch += spanheight;
				$this.cacheEndSpan = i;

			// If span does not fit
			}else{

				// Try and figure out line wrapping, where applicable
				if($this.cacheDisableGrouping && !("solo" in $this.lines[i]) && !("solo track" in $this.lines[i])
					&& !("video" in $this.lines[i]) && !("track" in $this.lines[i])){
					var desiredHeight = $this.cacheHeight - ch;
					var text = ""; var type;
					for(var key in $this.lines[i]){
						text = $this.lines[i][key];
						type = key;
					}

					// Run the cropping function, update the end word accordingly
					var cropped = $this.spanCrop(type,text,desiredHeight);
					if(cropped.length > 5){
						$this.cacheEndWord = cropped.length;
						acc += spanct.replace(/>.*?<\/div/,">"+cropped+"</div");
					}
				}

				// Advance cache
				$this.cacheFinished = false;
				$this.cacheEndPage++;
				$this.cache.push(acc);
				$this.cacheSpanID.push($this.cacheEndSpan);
				return acc;
			}

			// This is no longer checking the first span
			first = false;
		}
	}

	// Page control
	this.getPage = function(page){
		$this.finished = false;
		if(page >= $this.cache.length){
			for(var i = $this.cache.length; i <= page; i++){
				// Cache the next page
				$this.generateNextPage();

				// Reached the end of the script
				if($this.cacheFinished){
					$this.finished = true;
					$this.currentSpan = $this.cacheSpanID[$this.cache.length-1];
					$this.currentPage = $this.cache.length-1;
					return $this.cache[$this.cache.length-1];
				}
			}
		}
		$this.currentSpan = $this.cacheSpanID[page];
		$this.currentPage = page;
		return $this.cache[page];
	}
	this.nextPage = function(){ return this.getPage($this.currentPage+1); }

	// Span-based location control
	this.getSpan = function(spanIndex){
		$this.currentSpan = spanIndex;
		$this.finished = false;

		// Try to look up the span by page in the span cache
		for(var i = 1; i < $this.cacheSpanID.length; i++){
			if($this.cacheSpanID[i]>spanIndex){
				return $this.getPage(i);
			}
		}

		// Nope, don't have it. Time to generate pages until we do.
		if($this.cacheSpanID.length == 0 || spanIndex >= $this.cacheSpanID[$this.cache.length-1]){
			while($this.cacheEndSpan < spanIndex && $this.generateNextPage()){
				// Reached the end of the script
				if($this.cacheFinished){
					$this.finished = true;
					$this.currentSpan = $this.cacheSpanID[$this.cache.length-1];
					$this.currentPage = $this.cache.length-1;
					return $this.cache[$this.cache.length-1];
				}
			}
		}
		return $this.getPage($this.cache.length-1);
	}

	// Cache Control
	this.resize = function(newWidth,newHeight,disableGrouping){
		if(newWidth == $this.cacheWidth && newHeight == $this.cacheHeight)return;
		$this.cache = [];
		$this.cacheSpanID = [];
		$this.cacheEndPage = -1;
		$this.cacheEndSpan = -1;
		$this.cacheEndWord = -1;
		$this.cacheFinished = false;
		$this.cacheWidth = newWidth;
		$this.cacheHeight = newHeight;
		$this.cacheDisableGrouping = disableGrouping;
		$this.recalibrate();
	}
}

// Super-short PHP-esque templating with jQuery --------------------------------------
// VARIABLES: Prefixed with a $, can occur anywhere in the HTML code.
// TERNARY OPERATORS: $varName?trueValue:falseValue; Useful for boolean values
// Variable names can have lowecase letters, numbers, dashes and underscores
// (The lowercase restriction is a side effect of the browser's HTML preprocessing)
// Licenced for redistribution by Keaton Brandt, http://keaton.ws

function applyTemplate(templateName, data){
    var html = $("#"+templateName).html();                            // Get a copy the template html
    html=html.replace(/\$([a-zA-Z1-9\-\_]*)(\?(.*?)\:(.*?)\;)?/g,     // Regex to match variables & ternaries
        function(match,vn,tern,pass,fail){                            // Variable value substitution function
            if(!(vn in data))return "";                               // Remove variable if it doesn't exist
            if(tern)return (data[vn])?pass:fail;                      // Sub in ternary operation result
            return data[vn];                                          // Sub in the variable value
    }); return $(html);                                               // Returns a jQuery object with the html
}

// Debug Helpers -----------------------
// Tracks performance of functions

function timer(name,func){
	var t = new Date().getTime();
	func();
	var d = new Date().getTime() - t;
	console.log(name+" took "+d+"ms");
}