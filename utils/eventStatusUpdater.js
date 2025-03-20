const cron = require("node-cron");
const Event = require("../modules/event");
const Booking = require("../modules/bookings");


const updateEventStatuses = async () => {
    try {
        const events = await Event.find().populate({
            path: "bookingId",
            populate: {
                path: "response",
                populate: {
                    path: "venueRequest",
                },
            },
        });

        const today = new Date();

        for (let event of events) {
            if (!event.bookingId || !event.bookingId.response || !event.bookingId.response.venueRequest) {
                continue;
            }

            const eventDates = event.bookingId.response.venueRequest.eventDates;

            if (!eventDates || eventDates.length === 0) {
                continue;
            }

            const firstEventDate = new Date(eventDates[0]);
            const lastEventDate = new Date(eventDates[eventDates.length - 1]);

            let newStatus = event.status;

            if (today >= firstEventDate && today <= lastEventDate) {
                newStatus = "Ongoing";
            } else if (today > lastEventDate) {
                newStatus = "Completed";
            } else {
                newStatus = "Upcoming";
            }

            if (newStatus !== event.status) {
                event.status = newStatus;
                await event.save();
                console.log(`✅ Event ${event._id} status updated to ${newStatus}`);
            }
        }

        console.log("✅ Event statuses updated successfully!");
    } catch (err) {
        console.error("❌ Error updating event statuses:", err);
    }
};

cron.schedule("0 * * * *", async () => {
    console.log("🔄 Running scheduled event status update...");
    await updateEventStatuses();
});

module.exports = updateEventStatuses;
