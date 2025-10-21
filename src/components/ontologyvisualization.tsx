import React, { useEffect, useRef, useState, useCallback } from 'react';
import './ontologyvisualization.css';

interface OntologyDataNode {
  name: string; // Changed from label to name to match json
  id?: string; // id might be generated, so optional initially
  definition?: string; // definition might not exist on all original nodes
  children?: OntologyDataNode[];
}

interface OntologyNode extends OntologyDataNode {
  id: string;
  label: string; // Keep label for display consistency if needed, or map from name
  definition: string;
  children?: OntologyNode[];
  x: number;
  y: number;
  level: number;
  parentId?: string | null;
  isRoot?: boolean;
  // allChildren?: string[]; // This was in placeholder, assess if needed
  visible: boolean;
  hiddenByCollapse?: boolean; // To track if hidden due to parent collapse
  collapsed?: boolean; // To track if the node itself is collapsed
}

interface Connection {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  level: number;
}

const CARD_WIDTH = 220;
const CARD_HEIGHT = 130;
const CHILD_X_SPACING = 300;
const CHILD_Y_SPACING = 180;

const OntologyVisualization: React.FC = () => {
  const [nodes, setNodes] = useState<OntologyNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [scale, setScale] = useState(0.6);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startDragCoords, setStartDragCoords] = useState({ x: 0, y: 0 });
  const [startOffset, setStartOffset] = useState({ x: 0, y: 0 });
  const [currentlyZoomedNodeId, setCurrentlyZoomedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<OntologyNode | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const visualizationContainerRef = useRef<HTMLDivElement>(null);
  const nodeCounterRef = useRef(0);

  const updateTransform = useCallback(() => {
    if (visualizationContainerRef.current) {
      visualizationContainerRef.current.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
    }
    // const zoomLevelDisplay = document.getElementById('zoom-level-display'); // In original component
    // if (zoomLevelDisplay) {
    //   zoomLevelDisplay.textContent = `${Math.round(scale * 100)}%`;
    // }
  }, [offsetX, offsetY, scale]);

  useEffect(() => {
    updateTransform();
  }, [updateTransform]);

  const centerOnNodes = useCallback((targetNodes: OntologyNode[], newScale?: number) => {
    if (!targetNodes || targetNodes.length === 0 || !viewportRef.current) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    targetNodes.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + CARD_WIDTH);
      maxY = Math.max(maxY, node.y + CARD_HEIGHT);
    });

    const padding = targetNodes.length > 1 ? 50 : 20; // Further reduced padding
    minX -= padding;
    minY -= padding;
    maxX += padding;
    maxY += padding;

    const viewportWidth = viewportRef.current.offsetWidth;
    const viewportHeight = viewportRef.current.offsetHeight;

    const areaWidth = maxX - minX;
    const areaHeight = maxY - minY;
    const areaCenterX = minX + (areaWidth / 2);
    const areaCenterY = minY + (areaHeight / 2);

    const calculatedScale = newScale ?? Math.min(Math.min(viewportWidth / areaWidth, viewportHeight / areaHeight) * 0.95, 1.5); // Slightly increased multiplier
    
    setScale(calculatedScale);
    setOffsetX((viewportWidth / 2) - (areaCenterX * calculatedScale));
    setOffsetY((viewportHeight / 2) - (areaCenterY * calculatedScale));

    if (visualizationContainerRef.current) {
      visualizationContainerRef.current.style.transition = 'transform 0.5s ease-out';
      setTimeout(() => {
        if (visualizationContainerRef.current) {
          visualizationContainerRef.current.style.transition = 'none';
        }
      }, 500);
    }
  }, [setScale, setOffsetX, setOffsetY]);


  const drawConnectionsRecursive = useCallback((processedNodes: OntologyNode[]) => {
    const newConnections: Connection[] = [];
    processedNodes.forEach(node => {
      if (node.parentId && node.visible) {
        const parentNode = processedNodes.find(p => p.id === node.parentId);
        if (parentNode && parentNode.visible) {
          newConnections.push({
            id: `conn-${parentNode.id}-${node.id}`,
            x1: parentNode.x + CARD_WIDTH / 2,
            y1: parentNode.y + CARD_HEIGHT,
            x2: node.x + CARD_WIDTH / 2,
            y2: node.y,
            level: Math.min(parentNode.level, 5),
          });
        }
      }
    });
    setConnections(newConnections);
  }, []);


  const processNodeRecursive = useCallback((dataNode: OntologyDataNode, x: number, y: number, level: number, parentId: string | null, isRoot = false): OntologyNode[] => {
    const nodeId = `node_${nodeCounterRef.current++}`;
    const newNode: OntologyNode = {
      ...dataNode,
      id: nodeId,
      label: dataNode.name, // Assuming name is the primary display string
      definition: dataNode.definition || dataNode.name, // Fallback for definition
      x,
      y,
      level,
      parentId,
      isRoot,
      visible: isRoot, // Only the root node is visible initially
      collapsed: true, // All nodes start collapsed
      children: [], // Will be populated by recursive calls
    };

    let allProcessedNodes = [newNode];

    if (dataNode.children && dataNode.children.length > 0) {
      const totalChildrenWidth = dataNode.children.length * CHILD_X_SPACING;
      let startX = x + (CARD_WIDTH / 2) - (totalChildrenWidth / 2);
      
      dataNode.children.forEach((child) => {
        const childX = startX;
        const childY = y + CHILD_Y_SPACING;
        const processedChildren = processNodeRecursive(child, childX, childY, level + 1, nodeId);
        newNode.children?.push(...processedChildren.filter(cn => cn.parentId === nodeId)); // Add direct children
        allProcessedNodes = allProcessedNodes.concat(processedChildren);
        startX += CHILD_X_SPACING;
      });
    }
    return allProcessedNodes;
  }, []);
  
  useEffect(() => {
    const dataUrl = `${import.meta.env.BASE_URL}ontology_tree.json`;
    console.log(`Fetching data from: ${dataUrl}`); // Log the actual URL
    fetch(dataUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data: OntologyDataNode | OntologyDataNode[]) => {
        console.log("Fetched ontology data:", data); // DEBUG
        nodeCounterRef.current = 0; // Reset counter
        const rootDataNode = Array.isArray(data) ? data[0] : data; // Get the first element if it's an array
        if (!rootDataNode) {
          console.error("Ontology data is empty or invalid.");
          return;
        }
        const initialX = 50; // Fixed small coordinate for debugging
        const initialY = 50; // Fixed small coordinate for debugging
        const processedNodes = processNodeRecursive(rootDataNode, initialX, initialY, 0, null, true);
        console.log("Processed nodes (full array):", processedNodes); // DEBUG: Log the entire processedNodes array
        console.log("Processed nodes length:", processedNodes.length); // DEBUG: Log the length

        if (visualizationContainerRef.current) {
            console.log("Visualization container width:", visualizationContainerRef.current.offsetWidth);
            console.log("Visualization container height:", visualizationContainerRef.current.offsetHeight);
        }

        // Log coordinates of first few nodes if they exist
        processedNodes.slice(0, 5).forEach(node => {
            console.log(`Node ${node.id}: x=${node.x}, y=${node.y}, visible=${node.visible}, collapsed=${node.collapsed}`);
        });

        setNodes(processedNodes);
        // Temporarily disable initial centering for debugging
        if (processedNodes.length > 0) {
           setTimeout(() => {
            console.log("Initial centering on visible nodes"); // DEBUG
            const initiallyVisibleNodes = processedNodes.filter(n => n.visible);
            centerOnNodes(initiallyVisibleNodes);
           }, 100); 
        }
      })
      .catch(error => console.error('Error loading ontology data:', error));
  }, [processNodeRecursive, centerOnNodes]);

  useEffect(() => {
    drawConnectionsRecursive(nodes);
  }, [nodes, drawConnectionsRecursive]);


  const getDescendantIds = useCallback((nodeId: string, currentNodes: OntologyNode[]): string[] => {
    const descendants: string[] = [];
    const stack: string[] = [nodeId];
    const directChildrenMap = new Map<string, string[]>();

    currentNodes.forEach(n => {
        if (n.parentId) {
            if (!directChildrenMap.has(n.parentId)) {
                directChildrenMap.set(n.parentId, []);
            }
            directChildrenMap.get(n.parentId)!.push(n.id);
        }
    });

    while (stack.length > 0) {
        const currentId = stack.pop()!;
        const childrenIds = directChildrenMap.get(currentId) || [];
        for (const childId of childrenIds) {
            descendants.push(childId);
            stack.push(childId);
        }
    }
    return descendants;
}, []);


  const handleNodeClick = useCallback((clickedNodeId: string) => {
    setNodes(prevNodes => {
      const clickedNode = prevNodes.find(n => n.id === clickedNodeId);
      if (!clickedNode) return prevNodes;

      // Set the selected node for the side panel display
      setSelectedNode(clickedNode);

      let newNodes = [...prevNodes];
      const isEndNode = !clickedNode.children || clickedNode.children.length === 0;

      if (isEndNode) {
        if (currentlyZoomedNodeId === clickedNodeId) {
          // Zoom out to parent and its visible siblings
          setCurrentlyZoomedNodeId(null);
          const parentNode = newNodes.find(n => n.id === clickedNode.parentId);
          if (parentNode) {
            const visibleSiblings = newNodes.filter(n => n.parentId === parentNode.id && n.visible);
            centerOnNodes([parentNode, ...visibleSiblings]);
          } else { // If no parent, might be root, or orphan, center on itself
            centerOnNodes([clickedNode]);
          }
        } else {
          // Zoom in to this end node
          setCurrentlyZoomedNodeId(clickedNodeId);
          if (viewportRef.current) {
            const viewportRect = viewportRef.current.getBoundingClientRect();
            const targetWidth = viewportRect.width * 0.10; // Further reduced for less zoom
            const newScale = Math.min(targetWidth / CARD_WIDTH, 0.9); // Further reduced max scale
            centerOnNodes([clickedNode], newScale);
          }
        }
        return newNodes; // No visibility change for end node clicks directly
      }

      // Clicked a non-end node (collapsible node)
      setCurrentlyZoomedNodeId(null); // Reset any end-node zoom

      const newCollapsedState = !clickedNode.collapsed;

      // If expanding this node, first collapse its siblings
      if (!newCollapsedState) { // Only when expanding (newCollapsedState is false)
        const siblings = newNodes.filter(
          n => n.parentId === clickedNode.parentId && n.id !== clickedNodeId && !n.collapsed
        );

        siblings.forEach(siblingToCollapse => {
          const descendantIdsOfSibling = getDescendantIds(siblingToCollapse.id, newNodes);
          newNodes = newNodes.map(n => {
            if (n.id === siblingToCollapse.id) {
              return { ...n, collapsed: true, visible: true }; // Sibling itself remains visible but collapsed
            }
            if (descendantIdsOfSibling.includes(n.id)) {
              return { ...n, visible: false, hiddenByCollapse: true, collapsed: true };
            }
            return n;
          });
        });
      }
      
      newNodes = newNodes.map(n => {
        if (n.id === clickedNodeId) {
          return { ...n, collapsed: newCollapsedState };
        }
        // If collapsing the clicked node, hide its direct children
        if (n.parentId === clickedNodeId && newCollapsedState) {
           return { ...n, visible: false, hiddenByCollapse: true };
        }
        // If expanding the clicked node, show its direct children
        if (n.parentId === clickedNodeId && !newCollapsedState) {
            return { ...n, visible: true, hiddenByCollapse: false };
        }
        return n;
      });
      
      // Handle descendants for the clicked node
      if (newCollapsedState) { // If we just collapsed the clickedNode
          const allDescendantIdsToHide = getDescendantIds(clickedNodeId, newNodes);
          newNodes = newNodes.map(n => {
              if (allDescendantIdsToHide.includes(n.id)) {
                  // Ensure descendants are also marked as collapsed and hiddenByCollapse
                  return { ...n, visible: false, hiddenByCollapse: true, collapsed: true }; 
              }
              return n;
          });
      } else { // If we just expanded the clickedNode
           newNodes = newNodes.map(n => {
              if (n.parentId === clickedNodeId) {
                  // Direct children are made visible and their hiddenByCollapse is false
                  // Their own collapsed state remains as is (they might have been individually collapsed before parent)
                  return { ...n, visible: true, hiddenByCollapse: false };
              }
              return n;
          });
      }
      
      // Center view
      const childrenToConsiderForCentering = newNodes.filter(n => n.parentId === clickedNodeId && n.visible);
      if (newCollapsedState) { // If collapsed, center only on the clicked node
        centerOnNodes([clickedNode]);
      } else { // If expanded, center on node and its visible children
        centerOnNodes([clickedNode, ...childrenToConsiderForCentering]);
      }

      return newNodes;
    });
  }, [currentlyZoomedNodeId, centerOnNodes, getDescendantIds]);


  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== viewportRef.current && e.target !== visualizationContainerRef.current && !(e.target as HTMLElement).classList.contains('visualization-container')) return;
    setIsDragging(true);
    setStartDragCoords({ x: e.clientX, y: e.clientY });
    setStartOffset({ x: offsetX, y: offsetY });
    if (viewportRef.current) viewportRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - startDragCoords.x;
    const dy = e.clientY - startDragCoords.y;
    setOffsetX(startOffset.x + dx);
    setOffsetY(startOffset.y + dy);
  }, [isDragging, startDragCoords, startOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleWheelZoom = useCallback((e: WheelEvent) => {
    if (!viewportRef.current) return;
    e.preventDefault();

    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const beforeZoomX = (mouseX - offsetX) / scale;
    const beforeZoomY = (mouseY - offsetY) / scale;

    const zoomFactor = 1.05;
    let newScale;
    if (e.deltaY < 0) { // Scroll up - zoom in
      newScale = Math.min(scale * zoomFactor, 1.5);
    } else { // Scroll down - zoom out
      newScale = Math.max(scale / zoomFactor, 0.3);
    }

    const newOffsetX = mouseX - (beforeZoomX * newScale);
    const newOffsetY = mouseY - (beforeZoomY * newScale);
    
    setScale(newScale);
    setOffsetX(newOffsetX);
    setOffsetY(newOffsetY);

  }, [offsetX, offsetY, scale]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.addEventListener('wheel', handleWheelZoom, { passive: false });
    }
    return () => {
      if (viewport) {
        viewport.removeEventListener('wheel', handleWheelZoom);
      }
    };
  }, [handleWheelZoom]);
  
  const handleResetZoom = useCallback(() => {
    const rootNode = nodes.find(n => n.isRoot);
    if (rootNode) {
      console.log("Resetting zoom to root:", rootNode); // DEBUG
      setCurrentlyZoomedNodeId(null);
      setNodes(prevNodes => prevNodes.map(n => ({
          ...n,
          visible: true, // All nodes remain visible on reset
          collapsed: n.isRoot ? false : true, // Root is not collapsed, others are
          hiddenByCollapse: false // Ensure no nodes are hidden by collapse on reset
      })));
      // Let centerOnNodes calculate the scale for reset too
      centerOnNodes([rootNode]); 
    }
  }, [nodes, centerOnNodes, setNodes]);


  return (
    <div
      className="viewport"
      ref={viewportRef}
      onMouseDown={handleMouseDown}
    >
      <div
        className="visualization-container"
        ref={visualizationContainerRef}
      >
        {nodes.filter(node => node.visible).map(node => (
          <div
            key={node.id}
            className={`card ${node.isRoot ? 'root-card' : ''} ${node.collapsed ? 'collapsed' : ''} ${selectedNode?.id === node.id ? 'selected' : ''}`}
            style={{ left: `${node.x}px`, top: `${node.y}px` }}
            onClick={(e) => { e.stopPropagation(); handleNodeClick(node.id);}}
            data-id={node.id} // For potential debugging or direct DOM selection if ever needed
            data-level={node.level}
            data-parent-id={node.parentId}
          >
            <div className="card-name">{node.name}</div>
            {(node.children && node.children.length > 0) && (
              <div className="expand-icon"></div>
            )}
          </div>
        ))}
        {connections.map(conn => (
          <div
            key={conn.id}
            className={`connection-line connection-line-level-${conn.level}`}
            style={{
              width: `${Math.sqrt(Math.pow(conn.x2 - conn.x1, 2) + Math.pow(conn.y2 - conn.y1, 2))}px`,
              left: `${conn.x1}px`,
              top: `${conn.y1}px`,
              transform: `rotate(${Math.atan2(conn.y2 - conn.y1, conn.x2 - conn.x1) * 180 / Math.PI}deg)`
            }}
          ></div>
        ))}
      </div>
      <div className="zoom-controls">
        {/* Zoom buttons are hidden by CSS but logic could be re-enabled if needed */}
        {/* <button className="zoom-button" onClick={() => setScale(s => Math.min(s * 1.1, 1.5))}>+</button> */}
        {/* <button className="zoom-button" onClick={() => setScale(s => Math.max(s / 1.1, 0.3))}>-</button> */}
        <button className="reset-button" onClick={handleResetZoom}>Reset</button>
        {/* <div className="zoom-level" id="zoom-level-display">{Math.round(scale * 100)}%</div> */}
      </div>

      {selectedNode && (
        <div className="definition-panel">
          <h3 className="panel-title">{selectedNode.name}</h3>
          <p className="panel-definition">{selectedNode.definition}</p>
          <button className="close-panel-button" onClick={() => setSelectedNode(null)}>X</button>
        </div>
      )}

       {/* Banners from original HTML - assuming these are static or handled outside this component if needed */}
       {/* <img src="/left top banner.jpeg" alt="Left Banner" className="left-banner" /> */}
       {/* <img src="/mid title banner.jpeg" alt="Top Banner" className="top-banner" /> */}
    </div>
  );
};

export default OntologyVisualization;