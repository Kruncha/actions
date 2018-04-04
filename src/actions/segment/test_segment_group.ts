import * as chai from "chai"
import * as sinon from "sinon"

import * as Hub from "../../hub"
import { SegmentGroupAction } from "./segment_group"

const action = new SegmentGroupAction()

function expectSegmentMatch(request: Hub.ActionRequest, match: any) {
  const groupSpy = sinon.spy()
  const stubClient = sinon.stub(action as any, "segmentClientFromRequest")
    .callsFake(() => {
      return { group: groupSpy, flush: (cb: () => void) => cb()}
     })
  const stubAnon = sinon.stub(action as any, "generateAnonymousId").callsFake(() => "stubanon")
  return chai.expect(action.execute(request)).to.be.fulfilled.then(() => {
    chai.expect(groupSpy).to.have.been.calledWithMatch(match)
    stubClient.restore()
    stubAnon.restore()
  })
}

describe(`${action.constructor.name} unit tests`, () => {

  describe("action", () => {

    it("errors if the input has no attachment", () => {
      const request = new Hub.ActionRequest()
      return chai.expect(action.execute(request)).to.eventually
        .be.rejectedWith("No attached json")
    })

    it("errors if the query response has no fields", () => {
      const request = new Hub.ActionRequest()
      request.attachment = {dataJSON: {wrong: true}}
      return chai.expect(action.execute(request)).to.eventually
        .be.rejectedWith("Request payload is an invalid format.")
    })

    it("errors if the query response is has no data", () => {
      const request = new Hub.ActionRequest()
      request.attachment = {dataJSON: {fields: []}}
      return chai.expect(action.execute(request)).to.eventually
        .be.rejectedWith("Request payload is an invalid format.")
    })

    it("errors if there is no tag field", () => {
      const request = new Hub.ActionRequest()
      request.attachment = {dataJSON: {fields: [{}], data: []}}
      return chai.expect(action.execute(request)).to.eventually
        .be.rejectedWith("Query requires a field tagged segment_group_id.")
    })

    it("errors if there is no write key", () => {
      const request = new Hub.ActionRequest()
      request.attachment = {dataJSON: {
        fields: [{ name: "coolfield", tags: ["segment_group_id"]}],
        data: [],
      }}
      return chai.expect(action.execute(request)).to.eventually
        .be.rejectedWith("You must pass your Segment project's write key.")
    })

    it("works with segment_group_id", () => {
      const request = new Hub.ActionRequest()
      request.attachment = {dataJSON: {
        fields: [{ name: "coolfield", tags: ["segment_group_id"]}],
        data: [{coolfield: {value: "funvalue"}}],
      }}
      return expectSegmentMatch(request, {
        groupId: "funvalue",
        anonymousId: "stubanon",
        userId: null,
      })
    })

    it("works with segment_group_id and user_id", () => {
      const request = new Hub.ActionRequest()
      request.attachment = {dataJSON: {
        fields: [{ name: "coolfield", tags: ["segment_group_id"]}, {name: "coolid", tags: ["user_id"]}],
        data: [{ coolfield: { value: "funvalue"}, coolid: {value: "id"}}],
      }}
      return expectSegmentMatch(request, {
        groupId: "funvalue",
        userId: "id",
        anonymousId: null,
      })
    })

    it("works with segment_group_id, user id and anonymous id", () => {
      const request = new Hub.ActionRequest()
      request.attachment = {dataJSON: {
        fields: [
          { name: "coolfield", tags: ["segment_group_id"]},
          {name: "coolid", tags: ["user_id"]},
          {name: "coolanonymousid", tags: ["segment_anonymous_id"]}],
        data: [{ coolfield: {value: "funvalue"}, coolid: {value: "id"}, coolanonymousid: {value: "anon_id"}}],
      }}
      return expectSegmentMatch(request, {
        groupId: "funvalue",
        userId: "id",
        anonymousId: "anon_id",
      })
    })

  })

  describe("form", () => {
    it("has no form", () => {
      chai.expect(action.hasForm).equals(false)
    })
  })

})
