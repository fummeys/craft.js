import React from 'react';
import { transformJSXToNode } from "~packages/core/utils/transformJSX";
import { ROOT_NODE, ERROR_MOVE_NONCANVAS_CHILD, ERROR_MOVE_TO_DESCENDANT, ERROR_MOVE_INCOMING_PARENT, ERROR_MOVE_OUTGOING_PARENT, ERROR_MOVE_TO_NONCANVAS_PARENT, ERROR_INVALID_NODEID } from '~packages/shared/constants';
import { Canvas } from '~packages/core/nodes';
import { PlaceholderInfo } from '~packages/core/dnd/interfaces';
import { createRootContext } from '~packages/core/root/RootContext';

describe('ManagerActions', () => {
  
  describe('add', () => {
    it('insert node(s)', () => {
      const {actions, getState} = createRootContext();
      const node = transformJSXToNode(<h3>What</h3>, {
        id: 'tn1'
      });
      actions.add(node, ROOT_NODE);
      
      const nodes = [transformJSXToNode(<h3>What</h3>, {
        id: 'tn2'
      }), transformJSXToNode(<h3>Haha</h3>, { id: 'tn3'})];
      actions.add(nodes, ROOT_NODE);

      expect(Object.keys(getState().current.nodes)).toEqual(expect.arrayContaining(['tn1', 'tn2', 'tn3']));
      expect(getState().current.nodes[ROOT_NODE].data.nodes).toEqual(expect.arrayContaining(['tn1', 'tn2', 'tn3']));

    });
    it('insert at index', () => {
      const {actions, getState}  = createRootContext();
      const node1 = transformJSXToNode(<h3>What</h3>);
      const node2 = transformJSXToNode(<h3>What</h3>);
      const node3 = transformJSXToNode(<h3>What</h3>, {id: 'tn3'});
      actions.add([node1, node2], ROOT_NODE);

      actions.add({
        ...node3,
        index: 1
      }, ROOT_NODE);

      expect(getState().current.nodes[ROOT_NODE].data.nodes[1]).toBe('tn3');
    });
    it('reject adding node to a non-Canvas node', () => {
      const {actions} = createRootContext();

      actions.add(transformJSXToNode(<div></div>, {
        id: 'parent',
        ref : {
            outgoing: (node) => node.id == 'child' ? false : true
        }
      }), ROOT_NODE);

      expect(() => actions.add(transformJSXToNode(<div></div>, { id: 'child'}), 'parent')).toThrowError();
    });
    it('reject orphaned non-root node', () => {
      const {actions} = createRootContext();
      const node = transformJSXToNode(<h3>What</h3>);
      expect(() => actions.add(node)).toThrowError();
    });
    it('rejects incompatible node', () => {
      const {actions} = createRootContext();
      
      actions.add(transformJSXToNode(<div></div>, {
        id: 'rejectingContainer',
        ref: {
          incoming: () => false
        }
      }), ROOT_NODE);

      const node = transformJSXToNode(<div></div>, {id: 'tn4'});
      expect(() => actions.add(node, 'rejectingContainer')).toThrow()
    });
  });

  describe('move', () => {
    it('successfully move node', () => {
      const { actions, getState } = createRootContext();
      actions.add(transformJSXToNode(<Canvas />, {id: 'parent'}), ROOT_NODE);
      actions.add(transformJSXToNode(<h2 />, {id: 'child1'}), 'parent');
      actions.add(transformJSXToNode(<h2 />, {id: 'child2'}), 'parent');
      actions.add(transformJSXToNode(<h3 />, { id:'newChild'}), ROOT_NODE);
      
      expect(() => actions.move('newChild', 'parent', 1)).not.toThrowError();
      expect(getState().current.nodes['parent'].data.nodes).toEqual(expect.arrayContaining(['child1', 'newChild', 'child2']));
    })
    it('reject moving node that is not a direct child of a Canvas', () => {
      const {actions} = createRootContext();
      actions.add(transformJSXToNode(<Canvas />, {id: 'parent'}), ROOT_NODE);
      actions.add(transformJSXToNode(<div />, {id: 'descendant'}), 'parent');
      actions.add(transformJSXToNode(<Canvas id="Mycanvas" />, {id: 'child'}), 'descendant');
      expect(() => actions.move('child', ROOT_NODE, 0)).toThrowError(ERROR_MOVE_NONCANVAS_CHILD);
    });
    it('reject moving node to a non-Canvas parent', () => {
      const {actions} = createRootContext();
      actions.add(transformJSXToNode(<div />, {id: 'parent'}), ROOT_NODE);
      actions.add(transformJSXToNode(<h3 />, {id: 'child'}), ROOT_NODE);
      expect(() => actions.move('child', 'parent', 0)).toThrowError(ERROR_MOVE_TO_NONCANVAS_PARENT);
    });
    it('reject moving node to it`s own descendant', () => {
      const {actions} = createRootContext();
      actions.add(transformJSXToNode(<Canvas />, {id: 'parent'}), ROOT_NODE);
      actions.add(transformJSXToNode(<div></div>, {id: 'child'}), 'parent');
      actions.add(transformJSXToNode(<Canvas id="MyCanvas" />, {id: 'childCanvas'}), 'child');
      expect(() => actions.move('parent', 'childCanvas', 0)).toThrowError(ERROR_MOVE_TO_DESCENDANT);
    });
    it('reject moving node into incompatible parent', () => {
      const {actions} = createRootContext();
      actions.add(transformJSXToNode(<Canvas />, {
        id: 'parent',
        ref: {
          incoming: (node) => node.id == 'child' ? false : true
        }
      }), ROOT_NODE);

      actions.add(transformJSXToNode(<div></div>, {id: 'child'}), ROOT_NODE);
      expect(() => actions.move('child', 'parent', 0)).toThrowError(ERROR_MOVE_INCOMING_PARENT)
    });
    it('reject moving node out of disallowing-parent', () => {
      const {actions} = createRootContext();
      actions.add(transformJSXToNode(<Canvas />, {
        id: 'parent',
        ref: {
          outgoing: (node) => node.id == 'child' ? false : true
        }
      }), ROOT_NODE);
      
      actions.add(transformJSXToNode(<div></div>, {id: 'child'}), 'parent');
      expect(() => actions.move('child', ROOT_NODE, 0)).toThrowError(ERROR_MOVE_OUTGOING_PARENT)
    })
  });
  
  describe('setProp', () => {
    it('invalid node id', () => {
      const {actions} = createRootContext();
      expect(() => actions.setProp('child', (props: { text: string }) => { })).toThrowError(ERROR_INVALID_NODEID);
    });
    it('can update node prop', () => {
      const { actions, getState} = createRootContext();
      const TestComponent: React.FC<{ text: string }> = ({ text }) => {
        return (
          <h3>{text}</h3>
        )
      }
      actions.add(transformJSXToNode(<TestComponent text="Text1" />, {id: 'child'}), ROOT_NODE);
      actions.setProp('child', (props: { text: string }) => {
        props.text = "hi"
      });

      expect(getState().current.nodes['child'].data.props.text).toBe('hi');
    })
  });
  describe('setRef', () => {
    it('invalid node id', () => {
      const {actions} = createRootContext();
      expect(() => actions.setRef('child', (ref) => ref.dom = document.body)).toThrowError(ERROR_INVALID_NODEID);
    });
    it('can update node ref', () => {
      const { actions, getState} = createRootContext();
      actions.add(transformJSXToNode(<h2 />, {id: 'child'}), ROOT_NODE);
      const refValues = {
        incoming: jest.fn(),
        outgoing: jest.fn(),
        canDrag: jest.fn(),
        dom: document.body
      }

      actions.setRef('child', (ref) => {
        ref.dom = refValues.dom
        ref.outgoing = refValues.outgoing;
        ref.incoming = refValues.incoming;
        ref.canDrag = refValues.canDrag
      });

      expect(getState().current.nodes['child'].ref).toMatchObject(refValues);
    })
  });
  describe('setNodeEvent', () => {
    it('can update node event', () =>{
      const { actions, getState} = createRootContext();
      actions.add(transformJSXToNode(<h2 />, {id: 'child'}), ROOT_NODE);
      actions.add(transformJSXToNode(<h2 />, {id: 'child2'}), ROOT_NODE);
      actions.setNodeEvent('active', 'child');
      expect(getState().current.nodes['child'].event.active).toBeTruthy();

      actions.setNodeEvent('active', 'child2');
      expect(getState().current.nodes['child'].event.active).toBeFalsy();
      expect(getState().current.nodes['child2'].event.active).toBeTruthy();
    });
  });

  describe('setPlaceholder', () => {
    it('can set placeholder', () => {
      const { actions, getState } = createRootContext();
      actions.add(transformJSXToNode(<h2 />, {id: 'child'}), ROOT_NODE);
      actions.add(transformJSXToNode(<h2 />, {id: 'child1'}), ROOT_NODE);
      actions.setRef(ROOT_NODE, (ref) => {
        ref.dom = document.body;
      });
      actions.setRef('child', (ref) => {
        ref.dom = document.createElement('h1');
      });
      actions.setRef('child', (ref) => {
        ref.dom = document.createElement('h1');
      });
      const info: PlaceholderInfo = {
        placement: {
          index: 0,
          where: "before",
          parent: getState().current.nodes[ROOT_NODE],
          currentNode: getState().current.nodes['child']
        },
        error: null
      };
      actions.setPlaceholder(info);
      expect(getState().current['events'].placeholder).toMatchObject(info);
    });
  });
});