
import React, { Component } from 'react';
import IconTableHeader from './IconTableHeader'
import IconTableHeadRow from './IconTableHeadRow'
import ImageIcon from './ImageIcon'


const styles = {
    thumbContainer: {
        position: 'absolute',
        bottom: 25,
        left: 0,
        top: 29,
        overflow: 'auto',
        marginTop: 0,
        right: 0,
    }
}


const IconTable = React.createClass({

    getInitialState: function() {
        return {
            layout: 'icon',
            filterText: "",
        }
    },

    setLayout: function(layout) {
        this.setState({layout: layout});
    },

    setFilterText: function(filterText) {
        console.log("setFilterText", filterText);
        this.setState({filterText: filterText});
        setTimeout(this.deselectHiddenThumbs, 50);
    },

    deselectHiddenThumbs: function() {
        var imageIds = this._thumbsToDeselect;
        console.log("deselectHiddenThumbs", imageIds);

        if (imageIds.length === 0) {
            return;
        }
        var inst = this.props.inst;
        var containerNode = OME.getTreeImageContainerBestGuess(imageIds[0]);
        if (containerNode) {
            imageIds.forEach(function(iid){
                var selectedNode = inst.locate_node('image-' + iid, containerNode)[0];
                inst.deselect_node(selectedNode, true);
            });
        }
    },

    setThumbsToDeselect: function(imageIds) {
        this._thumbsToDeselect = imageIds;
    },

    componentDidMount: function() {
        var inst = this.props.inst;
        $(this.refs.dataIcons).selectable({
            filter: 'li.row',
            distance: 2,
            stop: function() {
                // Make the same selection in the jstree etc
                $(".ui-selected").each(function(){
                    var imageId = $(this).attr('data-id');
                    var containerNode = OME.getTreeImageContainerBestGuess(imageId);
                    var selectedNode = inst.locate_node('image-' + imageId, containerNode)[0];
                    inst.select_node(selectedNode, true);
                });
            },
            start: function() {
                inst.deselect_all();
            }
        });
    },

    componentWillUnmount: function() {
        // cleanup plugin
        $(this.refs.dataIcons).selectable( "destroy" );
    },

    handleIconClick: function(imageId, event) {
        var inst = this.props.inst;
        var containerNode = OME.getTreeImageContainerBestGuess(imageId);
        var selectedNode = inst.locate_node('image-' + imageId, containerNode)[0];

        // Deselect all to begin (supress jstree event)
        // inst.deselect_all(true);
        // inst.select_node(selectedNode, true);

        // Simply allow jstree to handle selection ranges etc by delegating
        // the event.
        // TODO: this fails when we have some thumbnails hidden (still get selected in range)
        var keys = {
            shiftKey: event.shiftKey,
            metaKey: event.metaKey
        }
        $("#" + selectedNode.id + ">a").trigger($.Event('click', keys));
    },

    render: function() {
        var parentNode = this.props.parentNode,
            inst = this.props.inst;
        var imgNodes = [];
        var dateFormatOptions = {
            weekday: "short", year: "numeric", month: "short",
            day: "numeric", hour: "2-digit", minute: "2-digit"
        };

        parentNode.children.forEach(function(ch){
            var childNode = inst.get_node(ch);
            // Ignore non-images under tags or 'deleted' under shares
            if (childNode.type == "image") {
                imgNodes.push(childNode);
            }
        });

        var imgJson = [],
            selFileSets = [],
            thumbsToDeselect = [],
            fltr = this.state.filterText;
        // Convert jsTree nodes into json for template
        imgNodes.forEach(function(node){
            var d = node.data.obj.date || node.data.obj.acqDate;
            var date = new Date(d);
            date = date.toLocaleTimeString(undefined, dateFormatOptions);
            var iData = {'id': node.data.obj.id,
                    'name': node.text,
                    'data': JSON.parse(JSON.stringify(node.data)),
                    'selected': node.state.selected,
                    'date': date,
                };
            // Note fileset IDs for selected images
            if (iData.selected) {
                var fsId = node.data.obj.filesetId;
                if (fsId) {
                    selFileSets.push(fsId);
                }
            }
            // Thumb version: random to break cache if thumbnails are -1 'in progress'
            // or we're refresing 1 or all thumbnails
            // if (node.data.obj.thumbVersion != undefined ||
            //         event.type === "refreshThumbnails" ||
            //         event.type === "refreshThumb") {
            //     var thumbVersion = node.data.obj.thumbVersion;
            //     if (thumbVersion === -1 || event.type === "refreshThumbnails" || (
            //             event.type === "refreshThumb" && data.imageId === iData.id)) {
            //         thumbVersion = getRandom();
            //         // We cache this to prevent new thumbnails requested on every
            //         // selection change. Refreshing of tree will reset thumbVersion.
            //         node.data.obj.thumbVersion = thumbVersion;
            //     }
            //     iData.thumbVersion = thumbVersion;
            // }
            // If image is in share and share is not owned by user...
            if (node.data.obj.shareId && !parentNode.data.obj.isOwned) {
                // share ID will be needed to open image viewer
                iData.shareId = node.data.obj.shareId;
            }

            if (fltr.length === 0 || iData.name.indexOf(fltr) > -1) {
                imgJson.push(iData);
            } else if (iData.selected) {
                thumbsToDeselect.push(iData.id);
            }
        });

        // Let parent know that some aren't shown
        this.setThumbsToDeselect(thumbsToDeselect);

        // Now we know which filesets are selected, we can
        // go through all images, adding fs-selection flag if in
        if (selFileSets.length > 0) {
            imgJson.forEach(function(img){
                if (selFileSets.indexOf(img.data.obj.filesetId) > -1) {
                    img.fsSelected = true;
                }
            });
        }

        var icons = imgJson.map(function(image){
            return (
                <ImageIcon
                    image={image}
                    key={image.id}
                    iconSize={this.props.iconSize}
                    handleIconClick={this.handleIconClick} />
            );
        }.bind(this));

        return (
        <div className="centrePanel">
            <IconTableHeader
                    filterText={this.state.filterText}
                    setFilterText={this.setFilterText}
                    layout={this.state.layout}
                    setLayout={this.setLayout} />
            <div style={styles.thumbContainer} >
                <ul
                    ref="dataIcons"
                    className={this.state.layout + "Layout"}>
                    <IconTableHeadRow />
                    {icons}
                </ul>
            </div>
        </div>);
    }
});

export default IconTable