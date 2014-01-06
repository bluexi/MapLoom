(function() {
  var module = angular.module('loom_table_view_service', []);

  var http_ = null;
  var service_ = null;

  module.provider('tableViewService', function() {
    this.$get = function($http) {
      http_ = $http;
      service_ = this;
      return this;
    };

    this.featureList = [];
    this.attributeNameList = [];

    this.showTable = function(layer) {

      service_.featureList = [];
      service_.attributeNameList = [];

      var url = layer.get('metadata').url + '/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=' +
          layer.get('metadata').name;
      http_.get(url).then(function(response) {
        var x2js = new X2JS();
        var json = x2js.xml_str2json(response.data);

        for (var i in layer.get('metadata').schema) {
          if (layer.get('metadata').schema[i]._name == 'geom' || layer.get('metadata').schema[i]._name == 'the_geom') {
            continue;
          }
          service_.attributeNameList.push(layer.get('metadata').schema[i]._name);
        }

        var index = layer.get('metadata').label;
        for (var feat in json.FeatureCollection.member) {
          var feature = {visible: true, properties: []};
          for (var attr in service_.attributeNameList) {
            if (!goog.isDef(json.FeatureCollection.member[feat][index][service_.attributeNameList[attr]])) {
              feature.properties[attr] = '';
            } else {
              feature.properties[attr] =
                  json.FeatureCollection.member[feat][index][service_.attributeNameList[attr]].toString();
            }
          }
          service_.featureList[feat] = feature;
        }

        $('#table-view-window').modal('show');
      });
    };
  });
}());
