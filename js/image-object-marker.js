"use strict";

// Global variables.
// At which position y of the displayed image is the top border of the marking area?
var markingAreaTopRelatedToOriginalImage = 0;
// At which position x of the displayed image is the left border of the marking area?
var markingAreaLeftRelatedToOriginalImage = 0;
// Save the coordinetas of each marker div on original image
var markingRectanglePositions = new Array();
// Marked fruits quantity.
var markedFruits = 0;

/**
 * Get the size of the original image and send it as an argument to a callback function.
 * @param callback A callback function to send the width and height as arguments.
 */
function getOriginalImageSize(callback) {
    var img = new Image();
    var obj = {width: 0, height: 0};
    img.onload = function () {
        obj.height = img.height;
        obj.width = img.width;
        callback(obj);
    }
    img.src = document.getElementById("drawnImage").src;
}

/**
 * Update the marking area size to make it a square.
 */
function adjustMarkingContainerSize() {
    var imageContainer = document.getElementById("imageContainer");
    var markingPanel = document.getElementById("markingPanel");
    imageContainer.style.width = markingPanel.clientWidth + "px";
    imageContainer.style.height = markingPanel.clientWidth + "px";
}

/**
 * Create and return a rectangular div for fruit marking on the original image.
 */
function generateDivToMarkFruit(x, y, width, height, classType) {
    var iDiv = document.createElement('div');
    iDiv.style.position = "absolute";
    iDiv.style.left = x + "px";
    iDiv.style.top = y + "px";
    iDiv.style.width = width + "px";
    iDiv.style.height = height + "px";
    iDiv.style.border = "1px solid rgba(0,100,255,1)";
    //iDiv.style.zIndex = "1000";

     iDiv.className = {
        "originalImage": (document.getElementById('tipo-fruto').checked ?  "unripe-fruit" :  "ripe-fruit"),
        "unripe-fruit": "unripe-fruit markingPanel-fruit",
        "ripe-fruit": "ripe-fruit markingPanel-fruit"
     }[classType];

    return iDiv;
}

/**
 * Create and return a div for fruit marking on the 'MarkingPanel'.
 */

/**
 * Add a rectangle over a fruit on the original image.
 */
function addFruit() {
    getOriginalImageSize(function (originalImage) {
        var drawnImage = document.getElementById("drawnImage");
        var xRatio = originalImage.width / drawnImage.clientWidth;
        var yRatio = originalImage.height / drawnImage.clientHeight;
        // class type
        var originalImageDiv = "originalImage";
        //var markingRectangle = document.getElementsByClassName("resize-drag");
        Array.from(document.getElementsByClassName("resize-drag")).forEach(function(element) {

            if (element.id != "markingRectangle") {

                if (element.getAttribute('data-x') == markingRectanglePositions[element.id].getAttribute('data-x') &&
                    element.getAttribute('data-y') == markingRectanglePositions[element.id].getAttribute('data-y')) {
                    return;
                }
            }
            var x = parseFloat(element.getAttribute('data-x'));
            var y = parseFloat(element.getAttribute('data-y'));
            var width = parseFloat(element.getAttribute('data-width'));
            var height = parseFloat(element.getAttribute('data-height'));
            var originalImagePanel = document.getElementById("originalImagePanel");

            var iDiv = generateDivToMarkFruit((x + markingAreaLeftRelatedToOriginalImage) / xRatio,
                (y + markingAreaTopRelatedToOriginalImage) / yRatio,
                width / xRatio,
                height / yRatio, originalImageDiv);
            iDiv.setAttribute('data-x', x);
            iDiv.setAttribute('data-y', y);
            if (element.id != "markingRectangle") {
                iDiv.id = element.id;
                markingRectanglePositions[element.id] = iDiv;
                $('#' + markingRectanglePositions[element.id].id).remove();
                originalImagePanel.insertBefore(iDiv, originalImagePanel.childNodes[0]);
            } else {
                iDiv.id = markedFruits++;
                // Save the coordinates of each div marker
                markingRectanglePositions.push(iDiv);        
                originalImagePanel.insertBefore(iDiv, originalImagePanel.childNodes[0]);
            }
        });
    });
}

/**
 * Add a rectangle over a fruit on the 'MarkingPanel'.
 */
function addFruitToMarkingPanel(clickX, clickY, xRatio, yRatio) {
    if (markingRectanglePositions.length == 0) {
        return;
    }

    $('.markingPanel-fruit').remove();
    var imageContainer = document.getElementById("imageContainer");
    var markingAreaWidth = $("#imageContainer").width();
    var markingAreaHeight = $("#imageContainer").height();

    // Click area size
    var searchAreaXLeft = clickX - markingAreaWidth;
    var searchAreaXRight = clickX + markingAreaWidth;
    var searchAreaYTop = clickY - markingAreaHeight;
    var searchAreaYDown = clickY + markingAreaHeight;

    markingRectanglePositions.forEach( function(element) {
        var divX = Number(element.style.left.replace("px", ""));
        var divY = Number(element.style.top.replace("px", ""));
        var divWidht = Number(element.style.width.replace("px", ""));
        var divHeight = Number(element.style.height.replace("px", ""));
        if((divX >= searchAreaXLeft && divX <= searchAreaXRight) && (divY >= searchAreaYTop && divY <= searchAreaYDown)) {

            var mDiv = generateDivToMarkFruit((divX - markingAreaLeftRelatedToOriginalImage / xRatio) * xRatio,
            (divY - markingAreaTopRelatedToOriginalImage / yRatio) * yRatio,
            divWidht * xRatio,
            divHeight * yRatio, element.className);
            //mDiv.setAttribute('data-x', parseFloat(element.getAttribute('data-x')));
            //mDiv.setAttribute('data-y', parseFloat(element.getAttribute('data-y')));
            mDiv.setAttribute('divid', parseInt(element.getAttribute('id')));
            mDiv.setAttribute('data-x', element.getAttribute('data-x'));
            mDiv.setAttribute('data-y', element.getAttribute('data-y'));
            mDiv.setAttribute('data-width', $(".resize-drag").css("width"));
            mDiv.setAttribute('data-height', $(".resize-drag").css("height"));
            mDiv.style.border = '3px solid rgba(255, 0, 0, 0.8)';
            mDiv.setAttribute('selected', false);
            mDiv.onclick = function() {
                if (!mDiv.selected) {
                    mDiv.selected = true;
                    mDiv.style.backgroundColor = 'rgba(0,0,255,0.3)';
                    mDiv.classList.toggle('markingPanel-fruit-selected');
                } else {
                    mDiv.selected = false;
                    mDiv.style.backgroundColor = 'transparent';
                    mDiv.classList.toggle('markingPanel-fruit-selected');
                }
            }

            imageContainer.insertBefore(mDiv, imageContainer.childNodes[0]);    
        }
    });

}

/**
*  Edit marking rectangles on markingPanel
*/

function edtiMarkingRectangle() {
    if (document.getElementById("markingRectangle")) {
        $("#markingRectangle").remove();
        $('.markingPanel-fruit').toggleClass('resize-drag');
    } else {
        $('.markingPanel-fruit').toggleClass('resize-drag');
    }

}

function fruitSelector() {
        if (!document.getElementById("markingRectangle")) {
        var imageContainer = document.getElementById("imageContainer");
        var divRectangle = document.createElement('div');
        divRectangle.className = "resize-drag";
        divRectangle.id = "markingRectangle";
        divRectangle.setAttribute('data-width', 120);
        divRectangle.setAttribute('data-height', 120);
        divRectangle.setAttribute('data-x', 0);
        divRectangle.setAttribute('data-y', 0);
        imageContainer.insertBefore(divRectangle, imageContainer.childNodes[0]);
    } else {
        $("#markingRectangle").remove();
    }
}

// Delete marked fruit
function deleteMarkedFruit() {
    Array.from(document.getElementsByClassName("markingPanel-fruit")).forEach(function(element) {
        if (element.getAttribute('selected').value == true) {
            $('#' + markingRectanglePositions[element.getAttribute('divid')].id).remove();
            markingRectanglePositions.splice(element.getAttribute('divid'),1);
    }
    });
        $('.markingPanel-fruit-selected').remove();
}

// Select fruits to display
function displayFruits (optionValues) {
    (optionValues.checked ? $('.' + optionValues.value).show() : $('.' + optionValues.value).hide());
}


$(document).ready(function () {
    $("#drawnImage").elevateZoom({
        zoomType: "lens",
        lensShape: "round",
        lensSize: 300,
        scrollzoom: true,
        responsive: true,
        containLensZoom: true
    });


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
            // resize from all edges and corners
            edges: {left: true, right: true, bottom: true, top: true},

            // keep the edges inside the parent
            restrictEdges: {
                outer: 'parent',
                endOnly: true,
            },

            // minimum size
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

            // update the element's style
            target.style.width = event.rect.width + 'px';
            target.style.height = event.rect.height + 'px';

            target.setAttribute('data-width', event.rect.width);
            target.setAttribute('data-height', event.rect.height);

            // translate when resizing from top or left edges
            x += event.deltaRect.left;
            y += event.deltaRect.top;

            //target.style.top = y + "px";
            //target.style.left = x + "px";

            target.style.webkitTransform = target.style.transform =
                'translate(' + x + 'px,' + y + 'px)';

            target.setAttribute('data-x', x);
            target.setAttribute('data-y', y);
        });

    $('.markingPanel-fruit').select();

    callback = function (clientX, clientY) {
        getOriginalImageSize(function (originalImage) {
            var topOffset = $("#drawnImage").offset().top - $(window).scrollTop();            
            var leftOffset = $("#drawnImage").offset().left - $(window).scrollLeft();
            var imageX = Math.round((clientX - leftOffset));
            var imageY = Math.round((clientY - topOffset));

            var drawnImage = document.getElementById("drawnImage");
            var xRatio = originalImage.width / drawnImage.clientWidth;
            var yRatio = originalImage.height / drawnImage.clientHeight;

            var markingAreaWidth = $("#imageContainer").width();
            var markingAreaHeight = $("#imageContainer").height();
            var deltaX = -imageX * xRatio + markingAreaWidth / 2;
            var deltaY = -imageY * yRatio + markingAreaHeight / 2;
            markingAreaTopRelatedToOriginalImage = imageY * yRatio - markingAreaHeight / 2;
            markingAreaLeftRelatedToOriginalImage = imageX * xRatio - markingAreaWidth / 2;
            $("#imageForMarking").css("background-position", deltaX + "px " + deltaY + "px");

            // Verify if there is a marker fruit on original image and add it to marking panel
            addFruitToMarkingPanel(imageX, imageY, xRatio, yRatio);
            if (!document.getElementById("markingRectangle")) {
                fruitSelector();
            }

        });
    };

    // As the initial value of data-x and data-y is null, set it to zero.
    var markingRectangle = document.getElementById("markingRectangle");
    markingRectangle.setAttribute('data-x', 0);
    markingRectangle.setAttribute('data-y', 0);
    // 120 is the .resize-draw width and height as defined in the css.
    markingRectangle.setAttribute('data-width', $(".resize-drag").css("width"));
    markingRectangle.setAttribute('data-height', $(".resize-drag").css("height"));

    // Create a toggle button.
    $('#fruit-type').bootstrapToggle({
        onstyle: 'success',
        on: 'Green fruit',
        off: 'Ripe fruit',
        offstyle: 'warning'
    });
});

