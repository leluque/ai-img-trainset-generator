"use strict";

// **********************************************
// Global variables.
// A reference to some HTML elements.
let drawnImage = null;
let imageContainer = null;
let markingPanel = null;
let markingRectangle = null;
let originalImagePanel = null;
let updateButton = null;
let addButton = null;
let imageForMarking = null;

// How far must objects' marking be? In other words, the absolute difference
// between two different objects' marking must be greater than TOLERANCE.
const TOLERANCE = 0.001;
// At which position y of the original image is the top border of the marking panel?
let markingPanelTopRelatedToOriginalImage = 0;
// At which position x of the original image is the left border of the marking panel?
let markingPanelLeftRelatedToOriginalImage = 0;
// Objects already marked.
let markedObjects = new Array();
// Sequence used to generate objects' marking ids.
let idSequence = 0;
// Last position at which the user clicked the drawn image.
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
 * This functions needs to be called only once.
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
    image.src = drawnImage.getAttribute('src');
}

/**
 * Update the marking panel size to make it a square.
 */
function adjustMarkingPanelSize() {
    imageContainer.style.width = imageContainer.style.height = `${markingPanel.clientWidth}px`;
}

/**
 * Create and return a rectangular div for marking an object on the
 * drawn image or on the marking panel.
 * @param {Number} x The x-coordinate of the marking.
 * @param {Number} y The y-coordinate of the marking.
 * @param {Number} width The marking width.
 * @param {Number} height The marking height.
 * @param {String} classType The class type. Must be 'drawn-image', 'type1-object' or 'type2-object'.
 */
function generateDivForMarkingObject(x, y, width, height, classType) {
    const generatedDiv = document.createElement('div');
	generatedDiv.style.position = "absolute";
	// The position and dimension in the original image is based on percentages.
	if('drawn-image' === classType) {
		generatedDiv.style.left = horizontalPixelToPercentage(x) + "%";
		generatedDiv.style.top = verticalPixelToPercentage(y) + "%";
		generatedDiv.style.width = horizontalPixelToPercentage(width) + "%";
		generatedDiv.style.height = verticalPixelToPercentage(height) + "%";
	} else {
		generatedDiv.style.left = x + "px";
		generatedDiv.style.top = y + "px";
		generatedDiv.style.width = width + "px";
		generatedDiv.style.height = height + "px";
	}

    generatedDiv.className = {
        'drawn-image': (document.getElementById('objectType').checked ? "type1-object" : "type2-object"),
        'type1-object': "type1-object markingPanel-object",
        'type2-object': "type2-object markingPanel-object"
    }[classType];

    return generatedDiv;
}

/**
 * Add the marking rectangle (on the marking panel) in the drawn image.
 * It also saves the generated div in the markedObjects array.
 */
function addObjectMarking() {
	if(EDITING === status) { // If the user is editing the marking panel, do not allow adding a new marking.
		alert('You are editing the marking panel. Click on the "Update" button to save the changes before adding a new marking.');
		return;
	}
	// If the marking rectangle is not visible, do not allow adding a new marking.
	if(isMarkingRectangleVisible()) {
		alert('The marking rectangle is not visible. Click on the first toolbar icon to make it visibile.');
		return;
	}
	
	// Get the marking rectangle position and size.
	const x = parseFloat(markingRectangle.getAttribute('data-x'));
	const y = parseFloat(markingRectangle.getAttribute('data-y'));
	const width = parseFloat(markingRectangle.getAttribute('data-width'));
	const height = parseFloat(markingRectangle.getAttribute('data-height'));
	
	// Calculate the div position on the drawn image.
    const divX1 = (x + markingPanelLeftRelatedToOriginalImage) / horizontalRatio;
	const divY1 = (y + markingPanelTopRelatedToOriginalImage) / verticalRatio;
	const divWidth = width / horizontalRatio;
	const divHeight = height / verticalRatio;

	// Check whether there is another object marked at the same position and
	// with the same size. If it is the case, discard the new object.
	let foundOneEqual = false;
	
	markedObjects.forEach(function(item, index) {
	    if (Math.abs(divX1 - horizontalPercentageToPixel(item.style.left)) < TOLERANCE &&
		    Math.abs(divY1 - verticalPercentageToPixel(item.style.top)) < TOLERANCE &&
			Math.abs(width / horizontalRatio - horizontalPercentageToPixel(item.style.width)) < TOLERANCE &&
			Math.abs(height / verticalRatio - verticalPercentageToPixel(item.style.height)) < TOLERANCE) {
			foundOneEqual = true;
			return;
		}
	});
	if(true === foundOneEqual) {
		alert('There is another marking at the same position. No marking will be added.');
		return;
	}
	
	// Generate a new div for the drawn image at the correct position and with the correct
	// dimension.
	const iDiv = generateDivForMarkingObject(divX1, divY1, divWidth, divHeight, 'drawn-image');
	iDiv.id = idSequence++;
	
	// Save the object marker.
	markedObjects.push(iDiv);        

	// Add the div to the drawn image.
	originalImagePanel.insertBefore(iDiv, originalImagePanel.childNodes[0]);			

	// Show the marker for the added object.
	showMarkedObjectsOnMarkingPanel(clickedX, clickedY, true);
}

/**
 * Update the markings (that was probably) changed by the user on the marking panel.
 */
function updateMarkings() {
	Array.from(document.getElementsByClassName('markingPanel-object')).forEach(function(item, index) {
		let marking = markedObjects[item.getAttribute('div-id')];

		// Get the marking position and size.
		// In this case, data-x stores the delta x related to the original div position.
		// In this case, data-y stores the delta y related to the original div position.
		const x = parseFloat(item.getAttribute('data-x'));
		const y = parseFloat(item.getAttribute('data-y'));
		const width = parseFloat(item.getAttribute('data-width'));
		const height = parseFloat(item.getAttribute('data-height'));
		
		// Calculate the new div position on the drawn image.
		const divWidth = width / horizontalRatio;
		const divHeight = height / verticalRatio;
		marking.style.left = horizontalPixelToPercentage(x / horizontalRatio + horizontalPercentageToPixel(marking.style.left)) + "%";
		marking.style.top = verticalPixelToPercentage(y / verticalRatio + verticalPercentageToPixel(marking.style.top)) + "%";
		marking.style.width = horizontalPixelToPercentage(divWidth) + "%";
		marking.style.height = verticalPixelToPercentage(divHeight) + "%";
		
		item.classList.remove('resize-drag');
		item.classList.remove('markingPanel-object-selected');		
	});
	// Hide the 'Update' button and enable the 'Add' button.
	updateButton.classList.add('dont-display');
	addButton.classList.remove('dont-display');
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
	// Convert the div position in percentages to pixels.
	let divX = Number(element.style.left.replace("%", "")) * drawnImage.clientWidth / 100;
	let divY = Number(element.style.top.replace("%", "")) * drawnImage.clientHeight / 100;
	let divWidth = Number(element.style.width.replace("%", "")) * drawnImage.clientWidth / 100;
	let divHeight = Number(element.style.height.replace("%", "")) * drawnImage.clientHeight / 100;

	// If the div must be shown in side the marking area.
	if((divX >= markingAreaX1 && divX <= markingAreaX2) &&
	   (divY >= markingAreaY1 && divY <= markingAreaY2)) {
		// Generate a div to mark an object on the marking area.
		divX *= horizontalRatio;
		divY *= verticalRatio;
		divWidth *= horizontalRatio;
		divHeight *= verticalRatio;
		const mDiv = generateDivForMarkingObject(divX - markingPanelLeftRelatedToOriginalImage,
											 divY - markingPanelTopRelatedToOriginalImage,
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
		var elements = document.getElementsByClassName('markingPanel-object')
		for(let i = elements.length - 1; i >= 0 ; i--) {
			elements[i].parentNode.removeChild(elements[i]);
		}
	}
	
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
	const howManyToEdit = document.getElementsByClassName('markingPanel-object').length;
	if(0 === howManyToEdit) {
		alert('There is no object mark to edit.');
		return;
	}

    hideMarkingRectangle();
	// Allow dragging and resizing on objects marks.
	var elements = document.getElementsByClassName('markingPanel-object');
	for(let i = 0; i < elements.length; i++) {
		elements[i].classList.add('resize-drag');
		elements[i].classList.add('markingPanel-object-selected');
	}
	// Hide the 'Add' button and enable the 'Update' button.
	addButton.classList.add('dont-display');
	updateButton.classList.remove('dont-display');
	
	status = EDITING;
}

/**
 * Hide the rectangular marker on the marking area.
 */
function hideMarkingRectangle() {
	markingRectangle.classList.add('dont-display');
	let visibilityButton = document.getElementById('toggleMarkingRectangleVisibility');
	visibilityButton.classList.remove('fa-eye-slash');
	visibilityButton.classList.add('fa-eye');
}

/**
 * Show the rectangular marker on the marking area.
 */
function showMarkingRectangle() {
	markingRectangle.classList.remove('dont-display');
	let visibilityButton = document.getElementById('toggleMarkingRectangleVisibility');
	visibilityButton.classList.remove('fa-eye');
	visibilityButton.classList.add('fa-eye-slash');
}

/**
 * Check whether the marking rectangle is visible.
 * @return true, if yes. false, otherwise.
 */
function isMarkingRectangleVisible() {
	return markingRectangle.classList.contains('dont-display');
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

	if(markingRectangle.classList.contains('dont-display')) {
		showMarkingRectangle();
	} else {
		hideMarkingRectangle();
	}
}

/**
 * Delete all objects' marking selected by the user.
 * An object's marking is selected if it has an attribute selected with value equals to true.
 */
function deleteSelectedObjectMarkings() {
	const howManyToDelete = document.querySelectorAll('.markingPanel-object[selected=true]').length;
	if(0 === howManyToDelete) {
		alert('There are no objects\' marking to delete.');
		return;
	}
	var confirmAnswer = confirm(`Do you really want to remove the ${howManyToDelete} selected objects' marking?`);
	if (true === confirmAnswer) {
		// Remove each mark from the markedObjects array.
		let elements = document.querySelectorAll('.markingPanel-object[selected=true]');
		for(let i = 0; i < elements.length; i++) {
			let divId = elements[i].getAttribute('div-id');
			let elementToRemove = document.getElementById(markedObjects[divId].id);
			elementToRemove.parentNode.removeChild(elementToRemove);
            markedObjects.splice(divId, 1);			
		}
		// Remove the markings from the marking area.
		elements = document.getElementsByClassName('markingPanel-object-selected');
		for(let i = elements.length - 1; i >= 0; i--) {
			elements[i].parentNode.removeChild(elements[i]);
		}
	}
}

/**
 * Toggle the visibility of the objects of the type specified as argument.
 * @param typeCheckbox The checkbox whose value is equal to the class of the objects' markings
 *                     whose visibility will be changed.
 */
function toggleObjectsMarkingVisibility(typeCheckbox) {
	let elements = document.getElementsByClassName(typeCheckbox.value);
	if(true === typeCheckbox.checked) {	
		for(let i = 0; i < elements.length; i++) {
			elements[i].classList.remove('dont-display');
		}
	} else {
		for(let i = 0; i < elements.length; i++) {
			elements[i].classList.add('dont-display');
		}
	}
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

/**
 * Convert the specified horizontal percentage into pixels.
 * @param {Number} horizontalPercentage The horizontal percentage that must be converted.
 */
function horizontalPercentageToPixel(horizontalPercentage) {
	horizontalPercentage = (typeof horizontalPercentage === typeof('sample')) ? parseFloat(horizontalPercentage.replace('%','')) : horizontalPercentage;
	return horizontalPercentage * drawnImage.clientWidth / 100;
}

/**
 * Convert the specified vertical percentage into pixels.
 * @param {Number} verticalPercentage The vertical percentage that must be converted.
 */
function verticalPercentageToPixel(verticalPercentage) {
	verticalPercentage = (typeof verticalPercentage === typeof('sample')) ? parseFloat(verticalPercentage.replace('%','')) : verticalPercentage;
	return verticalPercentage * drawnImage.clientHeight / 100;
}

/**
 * Convert the specified horizontal pixels into percentage.
 * @param {Number} horizontalPixel The horizontal pixels that must be converted.
 */
function horizontalPixelToPercentage(horizontalPixel) {
	horizontalPixel = (typeof horizontalPixel === typeof('sample')) ? parseFloat(horizontalPixel.replace('px','')) : horizontalPixel;
	return horizontalPixel / drawnImage.clientWidth * 100;
}

/**
 * Convert the specified vertical pixels into percentage.
 * @param {Number} verticalPixel The vertical pixels that must be converted.
 */

function verticalPixelToPercentage(verticalPixel) {
	verticalPixel = (typeof verticalPixel === typeof('sample')) ? parseFloat(verticalPixel.replace('px','')) : verticalPixel;
	return verticalPixel / drawnImage.clientHeight * 100;
}

/**
 * Register the interaction with objects' markings.
 */
function registerInteractionWithMarkings() {
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
}

$(document).ready(function () {
	// Store references to some HTML elements.
	drawnImage = document.getElementById('drawnImage');
	imageContainer = document.getElementById('imageContainer');
	markingPanel = document.getElementById('markingPanel');
	markingRectangle = document.getElementById('markingRectangle');
	originalImagePanel = document.getElementById("originalImagePanel");
	updateButton = document.getElementById("update");
	addButton = document.getElementById("add");
	imageForMarking = document.getElementById("imageForMarking");
	
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
			adjustMarkingPanelSize();
			registerInteractionWithMarkings();
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

	registerInteractionWithMarkings();
	
	// Callback is automatically called by a modified version of jquery.elevateZoom
	// we implemented when the user clicks over the drawn image.
    callback = function (clientX, clientY) {
		// Get the image (x, y) coordinate where the user clicked on.
		let jqueryDrawnImage = $('#drawnImage');
		const topOffset = jqueryDrawnImage.offset().top - $(window).scrollTop();
		const leftOffset = jqueryDrawnImage.offset().left - $(window).scrollLeft();
		const imageX = Math.round((clientX - leftOffset));
		const imageY = Math.round((clientY - topOffset));
		clickedX = imageX;
		clickedY = imageY;

		// Calculate the position of the marking area background that must be
		// set to show the region around the (x, y) coordinate where the user
		// clicked on.
		const markingAreaWidth = imageContainer.clientWidth;
		const markingAreaHeight = imageContainer.clientHeight;
		const deltaX = -imageX * horizontalRatio + markingAreaWidth / 2;
		const deltaY = -imageY * verticalRatio + markingAreaHeight / 2;
		// Store the marking area top-left position related to the original image.
		markingPanelTopRelatedToOriginalImage = imageY * verticalRatio - markingAreaHeight / 2;
		markingPanelLeftRelatedToOriginalImage = imageX * horizontalRatio - markingAreaWidth / 2;
		imageForMarking.style.backgroundPosition = `${deltaX}px ${deltaY}px`;

		// Verify if there are objects marked on the original image that must
		// be displayed on the marking panel and show any.
		showMarkedObjectsOnMarkingPanel(imageX, imageY);
		// If there no marking rectangle (on the marking area) is shown, show
		// one.
		if (!isMarkingRectangleVisible()) {
			showMarkingRectangle();
		}
    }; // End of callback.

    // As the initial value of data-x, data-y, data-width, and data-height is null,
	// set it to zero.
    markingRectangle.setAttribute('data-x', 0);
    markingRectangle.setAttribute('data-y', 0);
    markingRectangle.setAttribute('data-width', $(".resize-drag").css("width"));
    markingRectangle.setAttribute('data-height', $(".resize-drag").css("height"));

    // Create a toggle button for selecting the object type.
    $('#objectType').bootstrapToggle({
        onstyle: 'success',
        on: 'Type 2',
        off: 'Type 1',
        offstyle: 'warning'
    });
});

