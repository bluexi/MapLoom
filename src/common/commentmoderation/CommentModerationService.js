(function() {
  var module = angular.module('loom_comment_moderation_service', []);

  module.provider('commentModerationService', function() {

    var log = this.log = [];
    var updateCount = this.updateCount = 0;
    var commentModerationService;

    this.$get = function($translate, $q, $http, mapService, $rootScope, $compile) {
      var baseURL = '/maps/' + mapService.id + '/comments';
      var jsonReader = new ol.format.GeoJSON();
      var vectorSource = this.vectorSource = new ol.source.Vector();
      var popup = new ol.Overlay({
        element: document.getElementById('comment-view-box'),
        id: 'comment-view-box'
      });

      function refreshComments() {
        return $http({method: 'GET', url: baseURL}).then(function(resp) {
          log.length = 0;
          log.push.apply(log, jsonReader.readFeatures(resp.data));
          ++updateCount;
          for (var i = 0; i < log.length; ++i) {
            log[i].getGeometry().transform(new ol.proj.Projection({code: 'EPSG:4326'}),
                mapService.map.getView().getProjection());
          }
          vectorSource.clear();
          vectorSource.addFeatures(log);
        });
      }

      this.title = $translate.instant('comments');
      this.summaryMode = false;
      this.latestDraw = undefined;

      this.drawControl = new ol.interaction.Draw({
        source: this.vectorSource,
        type: 'Point'
      });

      this.selectControl = new ol.interaction.Select({
        condition: ol.events.condition.click
      });

      this.selectControl.on('select', function(evt) {
        var item = evt.selected[0];
        if (item && item.values_) {
          mapService.map.addOverlay(popup);
          var childScope = $rootScope.$new();
          childScope.item = item;
          childScope.commentModerationService = commentModerationService;
          childScope.mapService = mapService;
          $compile(mapService.map.getOverlayById('comment-view-box').getElement())(childScope);
          popup.setPosition(item.getGeometry().flatCoordinates);
        } else {
          mapService.map.removeOverlay(popup);
        }
      });

      mapService.map.once('postrender', function() {
        //TODO: Run check to see if comments are enabled for this map
        this.vectorLayer = new ol.layer.Vector({source: this.vectorSource, metadata: {
          title: 'Comments', uniqueID: 'comments'}});
        mapService.map.addLayer(this.vectorLayer);
        // mapService.map.addInteraction(this.drawControl);
        mapService.map.addInteraction(this.selectControl);

        this.drawControl.on('drawend', function(drawEvt) {
          console.log(drawEvt);
          this.latestDraw = drawEvt.feature;
          $('#commentAddWindow').modal('toggle');
        }.bind(this));

        refreshComments();

      }.bind(this));

      this.timeSearch = function(startTime, endTime) {
        return $http({method: 'GET', url: baseURL + '?start_date=' + startTime +
              '&end_date=' + endTime}).then(function(resp) {
          return jsonReader.readFeatures(resp.data);
        });
      };

      this.addComment = function(title, message, category, location) {
        console.log(arguments);
        if (location) {
          location.transform(mapService.map.getView().getProjection(), new ol.proj.Projection({code: 'EPSG:4326'}));
          location = new ol.format.GeoJSON().writeGeometry(location);
        }
        return $http({
          method: 'POST',
          url: baseURL,
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          xsrfCookieName: 'csrftoken',
          xsrfHeaderName: 'X-CSRFToken',
          data: $.param({
            title: title,
            message: message,
            category: category,
            feature_geom: location,
            map_id: mapService.id
          })
        });
      };

      this.modifyComment = function(id, status) {
        return $http({
          method: 'PUT',
          url: baseURL,
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          xsrfCookieName: 'csrftoken',
          xsrfHeaderName: 'X-CSRFToken',
          data: $.param({
            id: id,
            status: status
          })
        }).then(function(resp) {
          refreshComments();
          return resp;
        });
      };

      this.enableSummaryMode = function() {
        this.summaryMode = true;
        this.title = $translate.instant('comment_summary');
      };

      this.enableLatestMode = function() {
        this.summaryMode = false;
        this.title = $translate.instant('comments');
      };



      commentModerationService = this;
      return this;
    };

  });

}());
