import { NodeType, INode } from './Node';
import { IScenario, Scenario } from './Scenario';
import { ConditionHandler } from './ConditionHandler';
import { ILuisModel } from './Luis';
import { Map, List } from './Common';
import { Parser, IParserOptions } from './Parser';
import * as builder from 'botbuilder';
import * as path from 'path';
import * as extend from 'extend';
import * as strformat from 'strformat';

/**
 * Interface for the Navigator constructor options object
 * 
 * @export
 * @interface INavigatorOptions
 * @extends {IParserOptions}
 */
export interface INavigatorOptions extends IParserOptions {
	
} 

/**
 * Helper class to navigate the dialog graph
 * 
 * @export
 * @class Navigator
 */
export class Navigator {

  /**
   * Collection of Luis models
   * 
   * @type {Map<ILuisModel>}
   * @memberOf Navigator
   */
  public models: Map<ILuisModel>;
  /**
   * Collection of custom handlers
   * 
   * @type {Map<any>}
   * @memberOf Navigator
   */
  public handlers: Map<any>;

	/**
	 * Creates an instance of Navigator.
	 * 
	 * @param {Parser} parser
	 * @param {INavigatorOptions} [options={}]
	 * 
	 * @memberOf Navigator
	 */
	constructor(private parser: Parser, private options: INavigatorOptions = {}) {
    this.models = parser.models;
    this.handlers = parser.handlers;
	}


  /**
   * Returns the current node of the dialog
   * 
   * @param {builder.Session} session
   * @returns {INode}
   * 
   * @memberOf Navigator
   */
  public getCurrentNode(session: builder.Session): INode {
    console.log('getCurrentNode');
    let currNodeId = <string>session.privateConversationData._currentNodeId;
    if (!currNodeId) {
      let root = this.parser.root;
      session.privateConversationData._currentNodeId = root && root.id;
      return root;
    }

    let current = this.parser.getNodeInstanceById(currNodeId);
    return current;
  }

  /**
   * Retreives the next node in the dialog
   * 
   * @param {builder.Session} session
   * @returns {INode}
   * 
   * @memberOf Navigator
   */
  public getNextNode(session: builder.Session) : INode {
    console.log('getNextNode');
    let next : INode = null;
    let current = this.parser.getNodeInstanceById(session.privateConversationData._currentNodeId);

    // If there are child scenarios, see if one of them answers a condition
    // In case it is, choose the first step in that scenario to as the next step
    let scenarios: List<IScenario> = current.scenarios;
    for (var i=0; i<current.scenarios.size(); i++) {
      var scenario = current.scenarios.get(i);

      if (ConditionHandler.evaluateExpression(session.dialogData.data, scenario.condition)) {
        next = scenario.node || scenario.steps.get(0);
      }
    }

    // if no next yet, get the first step
    next = next || current.steps.get(0);

    // if no next yet, travel the graph, look for next at parents...
    // If there is no selected scenario, move to the next node.
    // If there is no next node, look recursively for next on parent nodes.
    var nodeNavigator = current;
    while (!next && nodeNavigator) {
      next = nodeNavigator.next;
      nodeNavigator = nodeNavigator.parent;
    }

    console.log(`getNextNode: [current: ${current.id}, next: ${next && next.id}]`);
    session.privateConversationData._currentNodeId = next && next.id;

    return next;
  }

}
