"use strict";

// **********************************************
// Global variables.
// At which position y of the original image is the top border of the marking area?
let markingAreaTopRelatedToOriginalImage = 0;
// At which position x of the original image is the left border of the marking area?
let markingAreaLeftRelatedToOriginalImage = 0;
// Coordinates of each object mark on the original image.
let markedObjects = new Array();
// Sequence used to generate marks' ids.
let idSequence = 0;
// Last position where the user clicked on the drawn image.
let clickedX = 0;
let clickedY = 0;
// Original image size.
let originalImageWidth = 0;
let originalImageHeight = 0;
// Ratio between the original and the drawn image.
let horizontalRatio = 0;
let verticalRatio = 0;
// What is the editor status?
// 1 - Waiting for the user to select an area over the drawn image.
// 2 - Editing the marking area.
const NON_EDITING = 1;
const EDITING = 2;
let status = NON_EDITING;
// **********************************************

/**
 * Get the size of the original image and send it as an argument to a callback function.
 * @param {Function} callback(size) A callback function that will receive the image size as its argument.
 */
function getOriginalImageSize(callback) {
    const image = new Image();
    const size = {width: 0, height: 0};
    image.onload = function () {
        size.height = image.height;
        size.width = image.width;
        callback(size);
    }
    image.src = $('#drawnImage').attr('src');
}

/**
 * Update the marking area size to make it a square.
 */
function adjustMarkingAreaSize() {
    const imageContainer = $('#imageContainer');
    const markingPanel = $('#markingPanel');
    imageContainer.width(markingPanel.width() + "px");
    imageContainer.height(markingPanel.width() + "px");
}

/**
 * Create and return a rectangular div for marking an object on the
 * drawn image or on the marking area.
 */
function generateDivForMarkingObject(x, y, width, height, classType) {
    const generatedDiv = document.createElement('div');
    generatedDiv.style.position = "absolute";
    generatedDiv.style.left = x + "px";
    generatedDiv.style.top = y + "px";
    generatedDiv.style.width = width + "px";
    generatedDiv.style.height = height + "px";

    generatedDiv.className = {
        "originalImage": (document.getElementById('objectType').checked ? "type1-object" : "type2-object"),
        "type1-object": "type1-object markingPanel-object",
        "type2-object": "type2-object markingPanel-object"
    }[classType];

    return generatedDiv;
}

/**
 * Add an object marker (a rectangle over an object) on the drawn image.
 * It also saves the generated div in the markedObjects array.
 */
function addObjectMarker() {
	if(EDITING === status) { // If the user is editing the marking area, stop.
		alert('You are editing the marking area. Click on the "Update" button to save the changes before adding a new marking.');
		return;
	}
	
	// Get the marking rectangle position and size.
	const markingRectangle = $("#markingRectangle")
	const x = parseFloat(markingRectangle.attr('data-x'));
	const y = parseFloat(markingRectangle.attr('data-y'));
	const width = parseFloat(markingRectangle.attr('data-width'));
	const height = parseFloat(markingRectangle.attr('data-height'));
	
	// Calculate the div position on the drawn image.
    const divX1 = (x + markingAreaLeftRelatedToOriginalImage) / horizontalRatio;
	const divY1 = (y + markingAreaTopRelatedToOriginalImage) / verticalRatio;
	const divWidth = width / horizontalRatio;
	const divHeight = height / verticalRatio;

	// Check whether there is another object marked at the same position and
	// with the same size. If it is the case, discard the new object.
	let foundOneEqual = false;
	const tolerance = 0.01;
	$.each(markedObjects, function(index, value) {
	    if (Math.abs(divX1 - parseFloat(value.style.left)) < tolerance &&
		    Math.abs(divY1 - parseFloat(value.style.top)) < tolerance &&
			Math.abs(width / horizontalRatio - parseFloat(value.style.width)) < tolerance &&
			Math.abs(height / verticalRatio - parseFloat(value.style.height)) < tolerance) {
			foundOneEqual = true;
			return;
		}
	});
	if(true === foundOneEqual) {
		alert('There is another marking at the same position. No marking will be added.');
		return;
	}
	
	// Generate a new div for the drawn image at the right position and with the right
	// dimension.
	const iDiv = generateDivForMarkingObject(divX1, divY1, divWidth, divHeight, "originalImage");
	iDiv.id = idSequence++;
	
	// Save the object marker.
	markedObjects.push(iDiv);        

	// Add the div to the drawn image.
	const originalImagePanel = document.getElementById("originalImagePanel");
	originalImagePanel.insertBefore(iDiv, originalImagePanel.childNodes[0]);			

	// Show the marker for the added object.
	showMarkedObjectsOnMarkingPanel(clickedX, clickedY, true);
}

/**
 * Update the markings (probably) changed by the user on the marking area.
 */
function updateMarkings() {
	$('.markingPanel-object').each(function() {
		let element = $(this);
		let marking = markedObjects[element.attr('div-id')];

		// Get the marking position and size.
		// In this case, data-x stores the delta x related to the original div position.
		// In this case, data-y stores the delta y related to the original div position.
		const x = parseFloat(element.attr('data-x'));
		const y = parseFloat(element.attr('data-y'));
		const width = parseFloat(element.attr('data-width'));
		const height = parseFloat(element.attr('data-height'));
		
		// Calculate the new div position on the drawn image.
		const divWidth = width / horizontalRatio;
		const divHeight = height / verticalRatio;
		marking.style.left = x / horizontalRatio + parseFloat(marking.style.left.replace("px","")) + "px";
		marking.style.top = y / verticalRatio + parseFloat(marking.style.top.replace("px","")) + "px";
		marking.style.width = divWidth + "px";
		marking.style.height = divHeight + "px";
		
		$(this).removeClass('resize-drag');
		$(this).removeClass('markingPanel-object-selected');
	});
	// Hide the 'Update' button and enable the 'Add' button.
	$('#update').hide();
	$('#add').show();
	status = NON_EDITING;
	// It was necessary to show again the objects marks because
	// the data-x and data-y positions were not working properly
	// after updating them.
	showMarkedObjectsOnMarkingPanel(clickedX, clickedY);
}

/**
 * Show on the marking panel the marking for the specified object.
 * The object is an element of the array markedObjects.
 */
function showMarkedObjectOnMarkingPanel(markingAreaX1, markingAreaY1, markingAreaX2, markingAreaY2, element) {
	let divX = Number(element.style.left.replace("px", ""));
	let divY = Number(element.style.top.replace("px", ""));
	let divWidth = Number(element.style.width.replace("px", ""));
	let divHeight = Number(element.style.height.replace("px", ""));
	
	if((divX >= markingAreaX1 && divX <= markingAreaX2) &&
	   (divY >= markingAreaY1 && divY <= markingAreaY2)) {
		// Generate a div to mark an object on the marking area.
		divX *= horizontalRatio;
		divY *= verticalRatio;
		divWidth *= horizontalRatio;
		divHeight *= verticalRatio;
		const mDiv = generateDivForMarkingObject(divX - markingAreaLeftRelatedToOriginalImage,
											 divY - markingAreaTopRelatedToOriginalImage,
											 divWidth, divHeight, element.className);

		mDiv.setAttribute('div-id', parseInt(element.getAttribute('id')));
		mDiv.setAttribute('data-x', element.style.left * horizontalRatio);
		mDiv.setAttribute('data-y', element.style.top * verticalRatio);
		mDiv.setAttribute('data-width', divWidth);
		mDiv.setAttribute('data-height', divHeight);
		mDiv.setAttribute('selected', false);

		// When the user clicks on an object marker, change its background.
		mDiv.onclick = function() {
			if ('true' === mDiv.getAttribute("selected")) {
				// During a marker edition, do not deselect it (otherwise,
				// when the user is resizing it, for example, it will deselect
				// it and change its background color).
				if(NON_EDITING === status) {
					mDiv.setAttribute('selected', false);
					mDiv.classList.toggle('markingPanel-object-selected');
				}
			} else {
				mDiv.setAttribute('selected', true);
				mDiv.classList.remove('markingPanel-object-selected');
				mDiv.classList.add('markingPanel-object-selected');
			}
		}

		imageContainer.insertBefore(mDiv, imageContainer.childNodes[0]);    
	}
}

/**
 * Show the object markers on the marking panel.
 */
function showMarkedObjectsOnMarkingPanel(clickX, clickY, onlyTheLast = false) {
    // If there are no objects to show, return.
	if (0 === markedObjects.length) {
        return;
    }

	// Remove all previous objects' markers from the marking panel.
	if(false === onlyTheLast) {
		$('.markingPanel-object').remove();
	}
	
    let imageContainer = document.getElementById("imageContainer");
    let markingAreaWidth = imageContainer.clientWidth;
    let markingAreaHeight = imageContainer.clientHeight;
    
	let markingAreaX1 = clickX - markingAreaWidth;
    let markingAreaX2 = clickX + markingAreaWidth;
    let markingAreaY1 = clickY - markingAreaHeight;
    let markingAreaY2 = clickY + markingAreaHeight;

	// Show only the last added object.
	if(onlyTheLast) {
		showMarkedObjectOnMarkingPanel(markingAreaX1, markingAreaY1, markingAreaX2, markingAreaY2, markedObjects[markedObjects.length-1]);
	} else {
		markedObjects.forEach(function(element) {
				showMarkedObjectOnMarkingPanel(markingAreaX1, markingAreaY1, markingAreaX2, markingAreaY2, element);
			}
		);
	}
}

/**
 * When the user clicks on the edit button, all object markers shown on
 * the marking area are made editable.
 * If there is no object marker on the marking area, a message is shown
 * to the user.
 */
function editMarkingRectangle() {
	if(EDITING === status) { // If the user is already editing the marking area, stop.
		alert('You are already editing the marking area. Click on the "Update" button to save the changes.');
		return;
	}
	// Check whether there are objects marks to edit.
	const howManyToEdit = $('.markingPanel-object').length;
	if(0 === howManyToEdit) {
		alert('There is no object mark to edit.');
		return;
	}

    hideMarkingRectangle();
	// Allow dragging and resizing on objects marks.
    $('.markingPanel-object').addClass('resize-drag');
	$('.markingPanel-object').addClass('markingPanel-object-selected');
	// Hide the 'Add' button and enable the 'Update' button.
	$('#add').hide();
	$('#update').show();
	
	status = EDITING;
}

/**
 * Hide the rectangular marker on the marking area.
 */
function hideMarkingRectangle() {
	$('#markingRectangle').hide();
}

/**
 * Show the rectangular marker on the marking area.
 */
function showMarkingRectangle() {
	$('#markingRectangle').show();
}

/**
 * If an rectangular marker is shown on the marking area, hide it.
 * If it is hidden, show it.
 */
function toggleMarkingRectangleVisibility() {
	if(EDITING === status) { // If the user is editing the marking area, stop.
		alert('You are editing the marking area. Click on the "Update" button to save the changes before showing the marking rectangle.');
		return;
	}

	$('#markingRectangle').toggle();
}

/**
 * Delete the selected objects markings.
 */
function deleteSelectedObjectMarkings() {
	const howManyToDelete = $('.markingPanel-object[selected=true]').length;
	if(0 === howManyToDelete) {
		alert('There is no object mark to delete.');
		return;
	}
	var confirmAnswer = confirm(`Do you really want to remove the ${howManyToDelete} selected marks!`);
	if (true === confirmAnswer) {
		// Remove each mark from the markedObjects array.
		$('.markingPanel-object[selected=true]').each(function() {
			let divId = $(this).attr('div-id');
			$('#' + markedObjects[divId].id).remove();
            markedObjects.splice(divId, 1);
		});
		// Remove the marks from the marking area.
        $('.markingPanel-object-selected').remove();
	}
}

/**
 * Display the objects of the type specified as argument.
 */
function displayObjects(typeCheckbox) {
	(typeCheckbox.checked ? $('.' + typeCheckbox.value).show() : $('.' + typeCheckbox.value).hide());
}

/**
 * Calculate and store the horizontal and vertical ratio between the original
 * and the drawn image.
 */
function calculateRatios() {
	const drawnImage = $("#drawnImage");
	horizontalRatio = originalImageWidth / drawnImage.width();
	verticalRatio = originalImageHeight / drawnImage.height();	
}

$(document).ready(function () {
	// Require the original image size and calculate some measures that will
	// be used later by other functions.
	getOriginalImageSize(function (originalImage) {
		// Store the original image size.
		originalImageWidth = originalImage.width;
		originalImageHeight = originalImage.height;

		// When the window resizes, recalculate some measures that will
		// be used later for other functions.
        $(window).resize(function() {
			calculateRatios();
			adjustMarkingAreaSize();
		});
		calculateRatios(); // Call it at least once.
	});

	// Create a zoom feature when the mouse moves over the image.
    $("#drawnImage").elevateZoom({
        zoomType: "lens",
        lensShape: "round",
        lensSize: 300,
        scrollzoom: true,
        responsive: true,
        containLensZoom: true
    });

	// Every element with the 'resize-drag' class must allow user interaction
	// for dragging and resizing.
    interact('.resize-drag')
        .draggable({
            onmove: window.dragMoveListener,
            restrict: {
                restriction: 'parent',
                elementRect: {top: 0, left: 0, bottom: 1, right: 1}
            },
            inertia: true,
        })
        .resizable({
            // Resize from all edges and corners.
            edges: {left: true, right: true, bottom: true, top: true},

            // Keep the edges inside the parent.
            restrictEdges: {
                outer: 'parent',
                endOnly: true,
            },

            // Minimum size.
            restrictSize: {
                min: {width: 30, height: 30},
            },

            inertia: true,
        })
        .on('dragmove', function (event) {
            var target = event.target,
                x = (parseFloat(target.getAttribute('data-x')) || 0),
                y = (parseFloat(target.getAttribute('data-y')) || 0);
            x += event.dx;
            y += event.dy;
    
            event.target.style.webkitTransform =
                event.target.style.transform =
                    'translate(' + x + 'px, ' + y + 'px)';
            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
        })
        .on('resizemove', function (event) {
            var target = event.target,
                x = (parseFloat(target.getAttribute('data-x')) || 0),
                y = (parseFloat(target.getAttribute('data-y')) || 0);

            // Update the element's width and height.
            target.style.width = event.rect.width + 'px';
            target.style.height = event.rect.height + 'px';

            target.setAttribute('data-width', event.rect.width);
            target.setAttribute('data-height', event.rect.height);

            // translate when resizing from top or left edges
            x += event.deltaRect.left;
            y += event.deltaRect.top;

            target.style.webkitTransform = target.style.transform =
                'translate(' + x + 'px,' + y + 'px)';

            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
        });

    $('.markingPanel-object').select();

	// Callback is automatically called by a modified version of jquery.elevateZoom
	// we implemented when the user clicks over the drawn image.
    callback = function (clientX, clientY) {
        getOriginalImageSize(function (originalImage) {
			// Get the image (x, y) coordinate where the user clicked on.
            const drawnImage = $("#drawnImage");
            const topOffset = drawnImage.offset().top - $(window).scrollTop();            
            const leftOffset = drawnImage.offset().left - $(window).scrollLeft();
            const imageX = Math.round((clientX - leftOffset));
            const imageY = Math.round((clientY - topOffset));
			clickedX = imageX;
			clickedY = imageY;

			// Calculate the horizontal and vertical ratio between the original
			// and the drawn image.

			// Calculate the position of the marking area background that must be
			// set to show the region around the (x, y) coordinate where the user
			// clicked on.
            const markingAreaWidth = $("#imageContainer").width();
            const markingAreaHeight = $("#imageContainer").height();
            const deltaX = -imageX * horizontalRatio + markingAreaWidth / 2;
            const deltaY = -imageY * verticalRatio + markingAreaHeight / 2;
			// Store the marking area top-left position related to the original image.
            markingAreaTopRelatedToOriginalImage = imageY * verticalRatio - markingAreaHeight / 2;
            markingAreaLeftRelatedToOriginalImage = imageX * horizontalRatio - markingAreaWidth / 2;
            $("#imageForMarking").css("background-position", deltaX + "px " + deltaY + "px");

            // Verify if there are objects marked on the original image that must
			// be displayed on the marking panel and show any.
            showMarkedObjectsOnMarkingPanel(imageX, imageY);
			// If there no marking rectangle (on the marking area) is shown, show
			// one.
            if (0 === $("#markingRectangle")) {
                toggleMarkingRectangleVisibility();
            }

        });
    }; // End of callback.

    // As the initial value of data-x, data-y, data-width, and data-height is null,
	// set it to zero.
    var markingRectangle = $("#markingRectangle");
    markingRectangle.attr('data-x', 0);
    markingRectangle.attr('data-y', 0);
    markingRectangle.attr('data-width', $(".resize-drag").css("width"));
    markingRectangle.attr('data-height', $(".resize-drag").css("height"));

    // Create a toggle button for selecting the object type.
    $('#objectType').bootstrapToggle({
        onstyle: 'success',
        on: 'Type 2',
        off: 'Type 1',
        offstyle: 'warning'
    });
});

