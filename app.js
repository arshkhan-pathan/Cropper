(function (global) {
  "use strict";

  const fabric = global.fabric || (global.fabric = {});

  fabric.Object.prototype.cornerStyle = "circle";

  const canvas = new fabric.Canvas("canvas");

  const UserImage = fabric.util.createClass(fabric.Image, {
    type: "userImage",

    disableCrop: false,

    clipPosition: null,

    cropWidth: 0,

    cropHeight: 0,

    initialize(element, options) {
      options = options || {};

      options = Object.assign(
        {
          cropHeight: this.height,
          cropWidth: this.width,
        },
        options
      );

      if (
        !("clipPosition" in options) ||
        Object.values(fabric.UserImage.CLIP_POSITIONS).indexOf(
          options.clipPosition
        ) === -1
      ) {
        options.clipPosition = fabric.UserImage.CLIP_POSITIONS.CENTER_MIDDLE;
      }

      this.callSuper("initialize", element, options);

      if (!this.disableCrop) {
        this.applyCrop();
      }
    },

    getCrop(image, size) {
      const width = size.width;
      const height = size.height;
      const aspectRatio = width / height;

      let newWidth;
      let newHeight;

      const imageRatio = image.width / image.height;

      if (aspectRatio >= imageRatio) {
        newWidth = image.width;
        newHeight = image.width / aspectRatio;
      } else {
        newWidth = image.height * aspectRatio;
        newHeight = image.height;
      }

      let x = 0;
      let y = 0;

      if (this.clipPosition === fabric.UserImage.CLIP_POSITIONS.LEFT_TOP) {
        x = 0;
        y = 0;
      } else if (
        this.clipPosition === fabric.UserImage.CLIP_POSITIONS.LEFT_MIDDLE
      ) {
        x = 0;
        y = (image.height - newHeight) / 2;
      } else if (
        this.clipPosition === fabric.UserImage.CLIP_POSITIONS.LEFT_BOTTOM
      ) {
        x = 0;
        y = image.height - newHeight;
      } else if (
        this.clipPosition === fabric.UserImage.CLIP_POSITIONS.CENTER_TOP
      ) {
        x = (image.width - newWidth) / 2;
        y = 0;
      } else if (
        this.clipPosition === fabric.UserImage.CLIP_POSITIONS.CENTER_MIDDLE
      ) {
        x = (image.width - newWidth) / 2;
        y = (image.height - newHeight) / 2;
      } else if (
        this.clipPosition === fabric.UserImage.CLIP_POSITIONS.CENTER_BOTTOM
      ) {
        x = (image.width - newWidth) / 2;
        y = image.height - newHeight;
      } else if (
        this.clipPosition === fabric.UserImage.CLIP_POSITIONS.RIGHT_TOP
      ) {
        x = image.width - newWidth;
        y = 0;
      } else if (
        this.clipPosition === fabric.UserImage.CLIP_POSITIONS.RIGHT_MIDDLE
      ) {
        x = image.width - newWidth;
        y = (image.height - newHeight) / 2;
      } else if (
        this.clipPosition === fabric.UserImage.CLIP_POSITIONS.RIGHT_BOTTOM
      ) {
        x = image.width - newWidth;
        y = image.height - newHeight;
      } else {
        console.error(
          new Error("Unknown clip position property - " + this.clipPosition)
        );
      }

      return {
        cropX: x,
        cropY: y,
        cropWidth: newWidth,
        cropHeight: newHeight,
      };
    },

    applyCrop() {
      if (this.disableCrop) return;

      const crop = this.getCrop(this.getOriginalSize(), {
        width: this.getScaledWidth(),
        height: this.getScaledHeight(),
      });

      this.set(crop);
      this.setCoords();
    },

    _render(ctx) {
      if (this.disableCrop) {
        this.cropX = 0;
        this.cropY = 0;
        this.callSuper("_render", ctx);
        return;
      }

      const width = this.width,
        height = this.height,
        cropWidth = this.cropWidth,
        cropHeight = this.cropHeight,
        cropX = this.cropX,
        cropY = this.cropY;

      ctx.save();
      ctx.drawImage(
        this._element,
        Math.max(cropX, 0),
        Math.max(cropY, 0),
        Math.max(1, cropWidth),
        Math.max(1, cropHeight),
        -width / 2,
        -height / 2,
        Math.max(0, width),
        Math.max(0, height)
      );
      ctx.restore();
    },

    toObject(options) {
      options = options || [];
      return this.callSuper(
        "toObject",
        [].concat(Array.from(options), [
          "cropWidth",
          "cropHeight",
          "disableCrop",
        ])
      );
    },
  });

  UserImage.CLIP_POSITIONS = {
    LEFT_TOP: "left-top",
    LEFT_MIDDLE: "left-middle",
    LEFT_BOTTOM: "left-bottom",
    CENTER_TOP: "center-top",
    CENTER_MIDDLE: "center-middle",
    CENTER_BOTTOM: "center-bottom",
    RIGHT_TOP: "right-top",
    RIGHT_MIDDLE: "right-middle",
    RIGHT_BOTTOM: "right-bottom",
  };

  UserImage.fromObject = function (object, callback) {
    fabric.util.loadImage(
      object.src,
      function (img, error) {
        if (error) {
          callback && callback(null, error);
          return;
        }
        fabric.Image.prototype._initFilters.call(
          object,
          object.filters,
          function (filters) {
            object.filters = filters || [];
            fabric.Image.prototype._initFilters.call(
              object,
              [object.resizeFilter],
              function (resizeFilters) {
                object.resizeFilter = resizeFilters[0];
                const image = new fabric.UserImage(img, object);
                callback(image);
              }
            );
          }
        );
      },
      null,
      object.crossOrigin
    );
  };

  fabric.UserImage = UserImage;
  fabric.UserImage.async = true;

  const controlsUtils = fabric.controlsUtils,
    scaleSkewStyleHandler = controlsUtils.scaleSkewCursorStyleHandler,
    scaleStyleHandler = controlsUtils.scaleCursorStyleHandler,
    scalingEqually = controlsUtils.scalingEqually,
    scalingYOrSkewingX = controlsUtils.scalingYOrSkewingX,
    scalingXOrSkewingY = controlsUtils.scalingXOrSkewingY,
    scaleOrSkewActionName = controlsUtils.scaleOrSkewActionName;

  function actionScalingOrSkewingCropHandler(eventData, transform, x, y) {
    const { target, corner } = transform;

    target.applyCrop();

    if (corner === "mr" || corner === "ml") {
      return scalingXOrSkewingY(eventData, transform, x, y);
    }

    if (corner === "mt" || corner === "mb") {
      return scalingYOrSkewingX(eventData, transform, x, y);
    }
  }

  function actionScalingEquallyCropHandler(eventData, transform, x, y) {
    const { target, corner } = transform;

    if (["tl", "tr", "bl", "br"].indexOf(corner) > -1 && eventData.shiftKey) {
      target.applyCrop();
    }

    return scalingEqually(eventData, transform, x, y);
  }

  function render(shadowOffsetX, shadowOffsetY, fn) {
    const angle = this.angle;

    return function (ctx, left, top, styleOverride, fabricObject) {
      if (fabricObject.disableCrop) {
        return controlsUtils.renderCircleControl(
          ctx,
          left,
          top,
          styleOverride,
          fabricObject
        );
      }

      ctx.save();
      ctx.translate(left, top);
      ctx.rotate(fabric.util.degreesToRadians(angle + fabricObject.angle));
      ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = shadowOffsetX;
      ctx.shadowOffsetY = shadowOffsetY;
      ctx.beginPath();
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.strokeStyle = "#FFFFFF";
      fn.call(this, ctx);
      ctx.stroke();
      ctx.restore();
    };
  }

  function renderLeftOrRight(ctx, left, top, styleOverride, fabricObject) {
    render.call(this, 0, 0, function (ctx) {
      ctx.moveTo(0, -8);
      ctx.lineTo(0, 8);
    })(ctx, left, top, styleOverride, fabricObject);
  }

  function renderTopOrBottom(ctx, left, top, styleOverride, fabricObject) {
    render.call(this, 0, 0, function (ctx) {
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
    })(ctx, left, top, styleOverride, fabricObject);
  }

  const userImageControls = {
    mr: new fabric.Control({
      x: 0.5,
      y: 0,
      cursorStyleHandler: scaleSkewStyleHandler,
      getActionName: scaleOrSkewActionName,
      actionHandler: actionScalingOrSkewingCropHandler,
      render: renderLeftOrRight,
    }),

    ml: new fabric.Control({
      x: -0.5,
      y: 0,
      cursorStyleHandler: scaleSkewStyleHandler,
      getActionName: scaleOrSkewActionName,
      actionHandler: actionScalingOrSkewingCropHandler,
      render: renderLeftOrRight,
    }),

    mt: new fabric.Control({
      x: 0,
      y: -0.5,
      cursorStyleHandler: scaleSkewStyleHandler,
      getActionName: scaleOrSkewActionName,
      actionHandler: actionScalingOrSkewingCropHandler,
      render: renderTopOrBottom,
    }),

    mb: new fabric.Control({
      x: 0,
      y: 0.5,
      cursorStyleHandler: scaleSkewStyleHandler,
      getActionName: scaleOrSkewActionName,
      actionHandler: actionScalingOrSkewingCropHandler,
      render: renderTopOrBottom,
    }),

    tl: new fabric.Control({
      x: -0.5,
      y: -0.5,
      cursorStyleHandler: scaleStyleHandler,
      actionHandler: actionScalingEquallyCropHandler,
    }),

    tr: new fabric.Control({
      x: 0.5,
      y: -0.5,
      cursorStyleHandler: scaleStyleHandler,
      actionHandler: actionScalingEquallyCropHandler,
    }),

    bl: new fabric.Control({
      x: -0.5,
      y: 0.5,
      cursorStyleHandler: scaleStyleHandler,
      actionHandler: actionScalingEquallyCropHandler,
    }),

    br: new fabric.Control({
      x: 0.5,
      y: 0.5,
      cursorStyleHandler: scaleStyleHandler,
      actionHandler: actionScalingEquallyCropHandler,
    }),

    mtr: new fabric.Control({
      x: 0,
      y: -0.5,
      actionHandler: controlsUtils.rotationWithSnapping,
      cursorStyleHandler: controlsUtils.rotationStyleHandler,
      offsetY: -40,
      withConnection: true,
      actionName: "rotate",
    }),
  };

  fabric.UserImage.prototype.controls = userImageControls;

  let imgObj = new Image(),
    image = null;

  imgObj.crossOrigin = "anonymous";
  imgObj.src =
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhytUzytfA9AEITzXcuhLhzWsw1lH1luGhEg";

  imgObj.onload = () => {
    image = new fabric.UserImage(imgObj, { left: 10, top: 50 });
    image.scaleToWidth(400);
    canvas.add(image);
  };

  document.querySelector("#toggle-crop").addEventListener("click", toggleCrop);
  const stateCrop = {};

  function toggleCrop() {
    const state = !image.disableCrop;

    if (state) {
      stateCrop.cropX = image.get("cropX");
      stateCrop.cropY = image.get("cropY");
      stateCrop.disableCrop = true;
    } else {
      stateCrop.disableCrop = false;
    }

    image.set(stateCrop);
    image.applyCrop();
    image.setCoords();

    canvas.requestRenderAll();
  }

  document.querySelector("#save").addEventListener("click", saveToJSON);
  let _image = null;

  function saveToJSON() {
    _image = image.toJSON();
    canvas.clear();
  }

  document.querySelector("#create").addEventListener("click", createFromJSON);

  function createFromJSON() {
    if (!_image) return;

    fabric.UserImage.fromObject(_image, function (img) {
      image = img;
      canvas.add(image);
    });
  }
})(window);
